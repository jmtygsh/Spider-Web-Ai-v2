import { and, eq } from "drizzle-orm";
import { type ConnectPluginId } from "@/constants/plugins";
import { INTEGRATION_AUTHORIZED_EVENT } from "@/features/integration-access/config/plugin-authorization";
import {
  listCalendarEventResources,
  listGmailThreadResources,
} from "@/features/integration-access";
import {
  syncMeetingProjection,
  syncMessageProjection,
  syncThreadProjection,
} from "@/features/projection-sync";
import {
  WORKFLOW_MEETING_REFRESH_EVENT,
  WORKFLOW_THREAD_REFRESH_EVENT,
  WORKFLOW_TIMELINE_REFRESH_EVENT,
} from "@/features/workflow/config/workflow";
import type {
  WorkflowMeetingRefreshEventData,
  WorkflowThreadRefreshEventData,
  WorkflowTimelineRefreshEventData,
} from "@/features/workflow/types/workflow";
import { inngest } from "@/server/configs/inngest";
import { db } from "@/server/db";
import { corsairAccounts, corsairIntegrations } from "@/server/db/schema";

type BootstrapAuthorizedIntegrationEventData = {
  pluginId: ConnectPluginId;
  workspaceId: string;
  tenantId: string;
  capabilityStatus: "authorized" | "sync_requested";
};

type WorkflowEventPayload = {
  id: string;
  name: string;
  data: Record<string, unknown>;
};

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

async function loadConnectedAccount(input: {
  tenantId: string;
  pluginId: ConnectPluginId;
}) {
  return await db
    .select({
      accountId: corsairAccounts.id,
      tenantId: corsairAccounts.tenantId,
      pluginId: corsairIntegrations.name,
    })
    .from(corsairAccounts)
    .innerJoin(
      corsairIntegrations,
      eq(corsairAccounts.integrationId, corsairIntegrations.id),
    )
    .where(
      and(
        eq(corsairAccounts.tenantId, input.tenantId),
        eq(corsairIntegrations.name, input.pluginId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

async function bootstrapGmailThreads(accountId: string) {
  const threads = await listGmailThreadResources({
    accountId,
    maxResults: 20,
    query: "newer_than:30d",
  });
  const threadIds: string[] = [];

  for (const thread of threads) {
    const projection = await syncThreadProjection({
      accountId,
      thread,
    });
    threadIds.push(projection.externalThreadId);

    for (const message of thread.messages ?? []) {
      await syncMessageProjection({
        accountId,
        message,
      });
    }
  }

  return uniqueStrings(threadIds);
}

async function bootstrapCalendarMeetings(accountId: string) {
  const meetings = await listCalendarEventResources({
    accountId,
    calendarId: "primary",
    maxResults: 20,
    timeMin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  const meetingIds: string[] = [];

  for (const meeting of meetings) {
    const projection = await syncMeetingProjection({
      accountId,
      meeting,
      calendarId: "primary",
    });
    meetingIds.push(projection.externalMeetingId);
  }

  return uniqueStrings(meetingIds);
}

export const bootstrapAuthorizedIntegrationWorkflow = inngest.createFunction(
  {
    id: "workflow-bootstrap-authorized-integration",
    name: "Workflow Bootstrap Authorized Integration",
    triggers: [{ event: INTEGRATION_AUTHORIZED_EVENT }],
    retries: 3,
  },
  async ({ event, step }) => {
    const input = event.data as BootstrapAuthorizedIntegrationEventData;
    const account = await step.run("load-connected-account", async () =>
      loadConnectedAccount({
        tenantId: input.tenantId,
        pluginId: input.pluginId,
      }),
    );

    if (!account) {
      return {
        bootstrapped: false,
        reason: "No connected Corsair account was available for this tenant/plugin.",
      };
    }

    const bootstrapResult = await step.run("bootstrap-projections", async () => {
      if (input.pluginId === "gmail") {
        const threadIds = await bootstrapGmailThreads(account.accountId);
        return {
          threadIds,
          meetingIds: [] as string[],
        };
      }

      if (input.pluginId === "googlecalendar") {
        const meetingIds = await bootstrapCalendarMeetings(account.accountId);
        return {
          threadIds: [] as string[],
          meetingIds,
        };
      }

      return {
        threadIds: [] as string[],
        meetingIds: [] as string[],
      };
    });

    const refreshEvents: WorkflowEventPayload[] = [
      {
        id: `bootstrap:${account.accountId}:timeline`,
        name: WORKFLOW_TIMELINE_REFRESH_EVENT,
        data: {
          accountId: account.accountId,
          reason: `${input.pluginId} bootstrap completed`,
        } satisfies WorkflowTimelineRefreshEventData,
      },
    ];

    for (const threadId of bootstrapResult.threadIds) {
      refreshEvents.push({
        id: `bootstrap:${account.accountId}:thread:${threadId}`,
        name: WORKFLOW_THREAD_REFRESH_EVENT,
        data: {
          accountId: account.accountId,
          tenantId: input.tenantId,
          normalizedEventId: `bootstrap:${account.accountId}`,
          threadId,
          messageId: null,
          reason: `${input.pluginId} bootstrap`,
        } satisfies WorkflowThreadRefreshEventData,
      });
    }

    for (const meetingId of bootstrapResult.meetingIds) {
      refreshEvents.push({
        id: `bootstrap:${account.accountId}:meeting:${meetingId}`,
        name: WORKFLOW_MEETING_REFRESH_EVENT,
        data: {
          accountId: account.accountId,
          tenantId: input.tenantId,
          normalizedEventId: `bootstrap:${account.accountId}`,
          meetingId,
          calendarId: "primary",
          reason: `${input.pluginId} bootstrap`,
        } satisfies WorkflowMeetingRefreshEventData,
      });
    }

    const dispatch = await step.sendEvent("dispatch-bootstrap-refresh-events", refreshEvents);

    return {
      bootstrapped: true,
      accountId: account.accountId,
      threadCount: bootstrapResult.threadIds.length,
      meetingCount: bootstrapResult.meetingIds.length,
      refreshEventIds: dispatch.ids,
    };
  },
);
