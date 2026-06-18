import {
  extractCommitmentsFromThread,
  extractSchedulingIntent,
  extractTopicsFromThread,
} from "@/features/extraction";
import { createWorkspaceCorsairClient } from "@/features/integration-access";
import {
  linkOpenActions,
  linkPersonToThreadsAndMeetings,
  linkThreadToMeeting,
  type OpenActionInput,
} from "@/features/linking";
import { refreshMeetingPrepOnChange } from "@/features/meeting-prep";
import {
  syncMeetingProjection,
  syncMessageProjection,
  syncThreadProjection,
  type CalendarEventResource,
  type GmailThreadResource,
  type MeetingProjection,
  type ThreadProjection,
} from "@/features/projection-sync";
import { buildRelationshipProfile } from "@/features/relationship-intelligence";
import { projectTimelineItems } from "@/features/timeline";
import {
  WORKFLOW_INTEGRATION_EVENT,
  WORKFLOW_MEETING_PREP_REFRESH_EVENT,
  WORKFLOW_MEETING_REFRESH_EVENT,
  WORKFLOW_MEETING_PREP_CRON,
  WORKFLOW_MEETING_PREP_OFFSETS,
  WORKFLOW_MEETING_PREP_WINDOW_MINUTES,
  WORKFLOW_RELATIONSHIP_REFRESH_EVENT,
  WORKFLOW_THREAD_REFRESH_EVENT,
  WORKFLOW_TIMELINE_REFRESH_EVENT,
} from "@/features/workflow/config/workflow";
import { retryTransientFailures } from "@/features/workflow/logic/retry-transient-failures";
import {
  loadAllMeetingProjections,
  loadAllThreadProjections,
  loadMeetingProjection,
  loadThreadProjection,
  loadWorkflowAccountIds,
} from "@/features/workflow/logic/workflow-store";
import type {
  WorkflowIntegrationEventData,
  WorkflowMeetingPrepOffset,
  WorkflowMeetingPrepRefreshEventData,
  WorkflowMeetingRefreshEventData,
  WorkflowRelationshipRefreshEventData,
  WorkflowThreadRefreshEventData,
  WorkflowTimelineRefreshEventData,
} from "@/features/workflow/types/workflow";
import { inngest } from "@/server/configs/inngest";

type CorsairDynamicClient = {
  [key: string]: unknown;
};

type WorkflowEventPayload = {
  id: string;
  name: string;
  data: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function getSignalString(
  signal: Record<string, unknown>,
  key: string,
): string | null {
  const value = signal[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim().toLowerCase() ?? null)
        .filter((value): value is string => !!value),
    ),
  );
}

function inferMeetingIdFromSignal(signal: Record<string, unknown>): string | null {
  const directEventId = getSignalString(signal, "eventId");
  if (directEventId) {
    return directEventId;
  }

  const resourceUri = getSignalString(signal, "resourceUri");
  if (!resourceUri) {
    return null;
  }

  try {
    const url = new URL(resourceUri);
    const queryEventId = url.searchParams.get("eventId")?.trim() ?? null;
    if (queryEventId) {
      return queryEventId;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    const eventsIndex = segments.lastIndexOf("events");
    const candidate =
      eventsIndex >= 0 && eventsIndex < segments.length - 1
        ? segments[eventsIndex + 1]
        : null;

    return candidate && candidate !== "events" ? candidate : null;
  } catch {
    return null;
  }
}

function extractThreadResource(result: unknown): GmailThreadResource | null {
  const record = asRecord(result);
  if (!record) return null;

  if (typeof record.id === "string" && Array.isArray(record.messages)) {
    return record as GmailThreadResource;
  }

  if (Array.isArray(record.threads) && record.threads.length > 0) {
    return extractThreadResource(record.threads[0]);
  }

  for (const key of ["thread", "data", "result"]) {
    const nested = extractThreadResource(record[key]);
    if (nested) return nested;
  }

  return null;
}

function extractMeetingResource(result: unknown): CalendarEventResource | null {
  const record = asRecord(result);
  if (!record) return null;

  if (
    typeof record.id === "string" &&
    ("start" in record || "summary" in record || "updated" in record)
  ) {
    return record as CalendarEventResource;
  }

  if (Array.isArray(record.events) && record.events.length > 0) {
    return extractMeetingResource(record.events[0]);
  }

  for (const key of ["event", "meeting", "data", "result"]) {
    const nested = extractMeetingResource(record[key]);
    if (nested) return nested;
  }

  return null;
}

async function callCorsairReadOperation(input: {
  plugin: "gmail" | "googlecalendar";
  operationCandidates: string[];
  payloadCandidates: Record<string, unknown>[];
}): Promise<unknown> {
  const client = (await createWorkspaceCorsairClient()) as unknown as CorsairDynamicClient;
  const pluginSurface = asRecord(client[input.plugin]);
  const actions = asRecord(pluginSurface?.actions);
  const execute = client.execute;
  let lastError: unknown = null;

  for (const operation of input.operationCandidates) {
    for (const payload of input.payloadCandidates) {
      const direct = pluginSurface?.[operation];
      if (typeof direct === "function") {
        try {
          return await (
            direct as (payload: Record<string, unknown>) => Promise<unknown>
          )(payload);
        } catch (error) {
          lastError = error;
        }
      }

      const action = actions?.[operation];
      if (typeof action === "function") {
        try {
          return await (
            action as (payload: Record<string, unknown>) => Promise<unknown>
          )(payload);
        } catch (error) {
          lastError = error;
        }
      }

      if (typeof execute === "function") {
        try {
          return await (
            execute as (payload: Record<string, unknown>) => Promise<unknown>
          )({
            plugin: input.plugin,
            operation,
            input: payload,
          });
        } catch (error) {
          lastError = error;
        }
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(
    `No compatible ${input.plugin} read operation was available for workflow refresh.`,
  );
}

async function fetchLatestThreadResource(
  threadId: string,
): Promise<GmailThreadResource | null> {
  const result = await callCorsairReadOperation({
    plugin: "gmail",
    operationCandidates: ["getThread", "findThread"],
    payloadCandidates: [{ threadId }, { id: threadId }],
  });

  return extractThreadResource(result);
}

async function fetchLatestMeetingResource(input: {
  meetingId: string;
  calendarId: string | null;
}): Promise<CalendarEventResource | null> {
  const payloads = [
    { eventId: input.meetingId, calendarId: input.calendarId ?? "primary" },
    { id: input.meetingId, calendarId: input.calendarId ?? "primary" },
  ];
  const result = await callCorsairReadOperation({
    plugin: "googlecalendar",
    operationCandidates: ["getEvent", "getCalendarEvent", "findEvent"],
    payloadCandidates: payloads,
  });

  return extractMeetingResource(result);
}

function buildOpenActionInputs(
  commitments: Awaited<ReturnType<typeof extractCommitmentsFromThread>>,
): OpenActionInput[] {
  return commitments.commitments.map((commitment) => ({
    id: commitment.id,
    title: commitment.title,
    description: commitment.sentence,
    ownerEmail: commitment.ownerEmail,
    participantEmails: commitment.participantEmails,
    relatedThreadId: commitments.threadId,
    relatedMeetingId: null,
    dueAt: null,
    topics: [],
  }));
}

function parseStartAt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function pickMeetingPrepOffset(
  meeting: MeetingProjection,
): WorkflowMeetingPrepOffset | null {
  const startAt = parseStartAt(meeting.startAt);
  if (startAt === null || meeting.isCancelled) {
    return null;
  }

  const minutesUntil = (startAt - Date.now()) / (1000 * 60);
  if (minutesUntil < 0) {
    return null;
  }

  for (const offset of WORKFLOW_MEETING_PREP_OFFSETS) {
    if (
      Math.abs(minutesUntil - offset.minutes) <=
      WORKFLOW_MEETING_PREP_WINDOW_MINUTES
    ) {
      return offset.label;
    }
  }

  return null;
}

export const fanOutProjectionRefresh = inngest.createFunction(
  {
    id: "workflow-fan-out-projection-refresh",
    name: "Workflow Fan Out Projection Refresh",
    triggers: [{ event: WORKFLOW_INTEGRATION_EVENT }],
    retries: 3,
  },
  async ({ event, step }) => {
    const input = event.data as WorkflowIntegrationEventData;
    const refreshEvents = await retryTransientFailures({
      step,
      stepId: "build-refresh-event-list",
      operation: async () => {
        const payloads: WorkflowEventPayload[] = [];
        const threadId = getSignalString(input.signal, "threadId");
        const messageId = getSignalString(input.signal, "messageId");
        const meetingId = inferMeetingIdFromSignal(input.signal);

        // Problem:
        // webhook ingestion currently stops after storing a normalized event.
        // Why this design:
        // one durable workflow event fans out isolated jobs so thread, meeting,
        // prep, relationship, and timeline refreshes can evolve independently.
        if (threadId) {
          payloads.push({
            id: `${input.normalizedEventId}:thread:${threadId}`,
            name: WORKFLOW_THREAD_REFRESH_EVENT,
            data: {
              accountId: input.accountId,
              tenantId: input.tenantId,
              normalizedEventId: input.normalizedEventId,
              threadId,
              messageId,
              reason: `${input.eventType} fan-out`,
            } satisfies WorkflowThreadRefreshEventData,
          });
        }

        if (input.provider === "googlecalendar") {
          payloads.push({
            id: `${input.normalizedEventId}:meeting:${meetingId ?? "unknown"}`,
            name: WORKFLOW_MEETING_REFRESH_EVENT,
            data: {
              accountId: input.accountId,
              tenantId: input.tenantId,
              normalizedEventId: input.normalizedEventId,
              meetingId,
              calendarId: getSignalString(input.signal, "calendarId"),
              reason: `${input.eventType} fan-out`,
            } satisfies WorkflowMeetingRefreshEventData,
          });
        }

        payloads.push({
          id: `${input.normalizedEventId}:timeline`,
          name: WORKFLOW_TIMELINE_REFRESH_EVENT,
          data: {
            accountId: input.accountId,
            reason: `${input.eventType} fan-out`,
          } satisfies WorkflowTimelineRefreshEventData,
        });

        return payloads;
      },
    });

    if (refreshEvents.length === 0) {
      return { dispatched: 0, eventIds: [] };
    }

    const result = await step.sendEvent("dispatch-refresh-events", refreshEvents);
    return {
      dispatched: refreshEvents.length,
      eventIds: result.ids,
    };
  },
);

export const refreshThreadProjectionWorkflow = inngest.createFunction(
  {
    id: "workflow-refresh-thread-projection",
    name: "Workflow Refresh Thread Projection",
    triggers: [{ event: WORKFLOW_THREAD_REFRESH_EVENT }],
    retries: 4,
  },
  async ({ event, step }) => {
    const input = event.data as WorkflowThreadRefreshEventData;
    const thread = await retryTransientFailures({
      step,
      stepId: "load-thread-and-sync",
      operation: async () => {
        const existingThread = await loadThreadProjection({
          accountId: input.accountId,
          threadId: input.threadId,
        });

        try {
          const latestThread = await fetchLatestThreadResource(input.threadId);
          if (!latestThread) {
            return existingThread;
          }

          const projection = await syncThreadProjection({
            accountId: input.accountId,
            thread: latestThread,
          });

          for (const message of latestThread.messages ?? []) {
            await syncMessageProjection({
              accountId: input.accountId,
              message,
            });
          }

          return projection;
        } catch (error) {
          if (existingThread) {
            return existingThread;
          }

          throw error;
        }
      },
    });

    if (!thread) {
      return {
        refreshed: false,
        reason: "No thread projection or provider thread was available.",
      };
    }

    const extracted = await retryTransientFailures({
      step,
      stepId: "refresh-thread-extractions",
      operation: async () => {
        const commitments = await extractCommitmentsFromThread({
          accountId: input.accountId,
          thread,
        });
        const topics = await extractTopicsFromThread({
          accountId: input.accountId,
          thread,
        });
        const schedulingIntent = await extractSchedulingIntent({
          accountId: input.accountId,
          thread,
        });

        return { commitments, topics, schedulingIntent };
      },
    });

    const links = await retryTransientFailures({
      step,
      stepId: "refresh-thread-links",
      operation: async () => {
        const meetings = await loadAllMeetingProjections(input.accountId);
        const threadMeetingLinks = await Promise.all(
          meetings.map((meeting) =>
            linkThreadToMeeting({
              accountId: input.accountId,
              thread,
              meeting,
            }),
          ),
        );

        const people = await linkPersonToThreadsAndMeetings({
          accountId: input.accountId,
          threads: [thread],
          meetings,
        });

        await linkOpenActions({
          accountId: input.accountId,
          actions: buildOpenActionInputs(extracted.commitments),
          threads: [thread],
          meetings,
        });

        return {
          people,
          linkedMeetingIds: threadMeetingLinks
            .filter((entry) => entry.isLinked)
            .map((entry) => entry.meetingId),
        };
      },
    });

    const derivedEvents: WorkflowEventPayload[] = [
      {
        id: `${input.normalizedEventId}:timeline:thread`,
        name: WORKFLOW_TIMELINE_REFRESH_EVENT,
        data: {
          accountId: input.accountId,
          reason: `thread refresh ${thread.externalThreadId}`,
        } satisfies WorkflowTimelineRefreshEventData,
      },
    ];

    const participantEmails = uniqueStrings(thread.participantEmails);
    if (participantEmails.length > 0) {
      derivedEvents.push({
        id: `${input.normalizedEventId}:relationships:${thread.externalThreadId}`,
        name: WORKFLOW_RELATIONSHIP_REFRESH_EVENT,
        data: {
          accountId: input.accountId,
          personEmails: participantEmails,
          reason: `thread refresh ${thread.externalThreadId}`,
        } satisfies WorkflowRelationshipRefreshEventData,
      });
    }

    for (const meetingId of uniqueStrings(links.linkedMeetingIds)) {
      derivedEvents.push({
        id: `${input.normalizedEventId}:prep:${meetingId}`,
        name: WORKFLOW_MEETING_PREP_REFRESH_EVENT,
        data: {
          accountId: input.accountId,
          meetingId,
          reason: `thread ${thread.externalThreadId} changed linked meeting context`,
          offset: null,
        } satisfies WorkflowMeetingPrepRefreshEventData,
      });
    }

    const dispatch = await step.sendEvent("dispatch-thread-derived-events", derivedEvents);

    return {
      refreshed: true,
      threadId: thread.externalThreadId,
      participantCount: links.people.persons.length,
      scheduledEventIds: dispatch.ids,
    };
  },
);

export const refreshMeetingProjectionWorkflow = inngest.createFunction(
  {
    id: "workflow-refresh-meeting-projection",
    name: "Workflow Refresh Meeting Projection",
    triggers: [{ event: WORKFLOW_MEETING_REFRESH_EVENT }],
    retries: 4,
  },
  async ({ event, step }) => {
    const input = event.data as WorkflowMeetingRefreshEventData;
    const meeting = await retryTransientFailures({
      step,
      stepId: "load-meeting-and-sync",
      operation: async () => {
        if (!input.meetingId) {
          return null;
        }

        const existingMeeting = await loadMeetingProjection({
          accountId: input.accountId,
          meetingId: input.meetingId,
        });

        try {
          const latestMeeting = await fetchLatestMeetingResource({
            meetingId: input.meetingId,
            calendarId: input.calendarId,
          });
          if (!latestMeeting) {
            return existingMeeting;
          }

          return await syncMeetingProjection({
            accountId: input.accountId,
            meeting: latestMeeting,
            calendarId: input.calendarId,
          });
        } catch (error) {
          if (existingMeeting) {
            return existingMeeting;
          }

          throw error;
        }
      },
    });

    const derivedEvents: WorkflowEventPayload[] = [
      {
        id: `${input.normalizedEventId}:timeline:meeting`,
        name: WORKFLOW_TIMELINE_REFRESH_EVENT,
        data: {
          accountId: input.accountId,
          reason: input.reason,
        } satisfies WorkflowTimelineRefreshEventData,
      },
    ];

    if (!meeting) {
      const dispatch = await step.sendEvent("dispatch-meeting-fallback-events", derivedEvents);
      return {
        refreshed: false,
        meetingId: input.meetingId,
        scheduledEventIds: dispatch.ids,
      };
    }

    const graph = await retryTransientFailures({
      step,
      stepId: "refresh-meeting-links",
      operation: async () => {
        const threads = await loadAllThreadProjections(input.accountId);
        await Promise.all(
          threads.map((thread) =>
            linkThreadToMeeting({
              accountId: input.accountId,
              thread,
              meeting,
            }),
          ),
        );

        return await linkPersonToThreadsAndMeetings({
          accountId: input.accountId,
          threads,
          meetings: [meeting],
        });
      },
    });

    derivedEvents.push({
      id: `${input.normalizedEventId}:prep:${meeting.externalMeetingId}`,
      name: WORKFLOW_MEETING_PREP_REFRESH_EVENT,
      data: {
        accountId: input.accountId,
        meetingId: meeting.externalMeetingId,
        reason: `meeting refresh ${meeting.externalMeetingId}`,
        offset: null,
      } satisfies WorkflowMeetingPrepRefreshEventData,
    });

    const participantEmails = uniqueStrings([
      meeting.organizer?.email,
      meeting.creator?.email,
      ...meeting.attendees.map((attendee) => attendee.email),
    ]);

    if (participantEmails.length > 0) {
      derivedEvents.push({
        id: `${input.normalizedEventId}:relationships:${meeting.externalMeetingId}`,
        name: WORKFLOW_RELATIONSHIP_REFRESH_EVENT,
        data: {
          accountId: input.accountId,
          personEmails: participantEmails,
          reason: `meeting refresh ${meeting.externalMeetingId}`,
        } satisfies WorkflowRelationshipRefreshEventData,
      });
    }

    const dispatch = await step.sendEvent("dispatch-meeting-derived-events", derivedEvents);
    return {
      refreshed: true,
      meetingId: meeting.externalMeetingId,
      participantCount: graph.persons.length,
      scheduledEventIds: dispatch.ids,
    };
  },
);

export const refreshMeetingPrepWorkflow = inngest.createFunction(
  {
    id: "workflow-refresh-meeting-prep",
    name: "Workflow Refresh Meeting Prep",
    triggers: [{ event: WORKFLOW_MEETING_PREP_REFRESH_EVENT }],
    retries: 3,
  },
  async ({ event, step }) => {
    const input = event.data as WorkflowMeetingPrepRefreshEventData;
    const meeting = await retryTransientFailures({
      step,
      stepId: "load-meeting-for-prep",
      operation: async () =>
        loadMeetingProjection({
          accountId: input.accountId,
          meetingId: input.meetingId,
        }),
    });

    if (!meeting || meeting.isCancelled) {
      return {
        refreshed: false,
        meetingId: input.meetingId,
      };
    }

    const output = await retryTransientFailures({
      step,
      stepId: "refresh-meeting-prep",
      operation: async () =>
        refreshMeetingPrepOnChange({
          accountId: input.accountId,
          meeting,
        }),
    });

    return {
      refreshed: true,
      meetingId: input.meetingId,
      offset: input.offset,
      briefVersion: output.brief.version,
    };
  },
);

export const refreshRelationshipProfilesWorkflow = inngest.createFunction(
  {
    id: "workflow-refresh-relationship-profiles",
    name: "Workflow Refresh Relationship Profiles",
    triggers: [{ event: WORKFLOW_RELATIONSHIP_REFRESH_EVENT }],
    retries: 3,
  },
  async ({ event, step }) => {
    const input = event.data as WorkflowRelationshipRefreshEventData;
    const personEmails = uniqueStrings(input.personEmails);

    const profiles = await retryTransientFailures({
      step,
      stepId: "refresh-relationship-profiles",
      operation: async () =>
        Promise.all(
          personEmails.map((personEmail) =>
            buildRelationshipProfile({
              accountId: input.accountId,
              personEmail,
            }),
          ),
        ),
    });

    return {
      refreshed: profiles.length,
      personEmails,
    };
  },
);

export const refreshTimelineWorkflow = inngest.createFunction(
  {
    id: "workflow-refresh-timeline",
    name: "Workflow Refresh Timeline",
    triggers: [{ event: WORKFLOW_TIMELINE_REFRESH_EVENT }],
    retries: 3,
  },
  async ({ event, step }) => {
    const input = event.data as WorkflowTimelineRefreshEventData;
    const projection = await retryTransientFailures({
      step,
      stepId: "project-timeline-items",
      operation: async () =>
        projectTimelineItems({
          accountId: input.accountId,
        }),
    });

    return {
      refreshed: true,
      itemCount: projection.items.length,
      reason: input.reason,
    };
  },
);

export const runScheduledMeetingPrep = inngest.createFunction(
  {
    id: "workflow-run-scheduled-meeting-prep",
    name: "Workflow Run Scheduled Meeting Prep",
    triggers: [{ cron: WORKFLOW_MEETING_PREP_CRON }],
    retries: 2,
  },
  async ({ step }) => {
    const scheduledRefreshes = await retryTransientFailures({
      step,
      stepId: "collect-scheduled-prep-targets",
      operation: async () => {
        const accountIds = await loadWorkflowAccountIds();
        const payloads: WorkflowEventPayload[] = [];

        for (const accountId of accountIds) {
          const meetings = await loadAllMeetingProjections(accountId);
          for (const meeting of meetings) {
            const offset = pickMeetingPrepOffset(meeting);
            if (!offset) continue;

            payloads.push({
              id: `scheduled-prep:${accountId}:${meeting.externalMeetingId}:${offset}:${meeting.version}`,
              name: WORKFLOW_MEETING_PREP_REFRESH_EVENT,
              data: {
                accountId,
                meetingId: meeting.externalMeetingId,
                reason: `scheduled prep ${offset} before meeting`,
                offset,
              } satisfies WorkflowMeetingPrepRefreshEventData,
            });
          }
        }

        return payloads;
      },
    });

    if (scheduledRefreshes.length === 0) {
      return { dispatched: 0, eventIds: [] };
    }

    const result = await step.sendEvent(
      "dispatch-scheduled-prep-events",
      scheduledRefreshes,
    );

    return {
      dispatched: scheduledRefreshes.length,
      eventIds: result.ids,
    };
  },
);
