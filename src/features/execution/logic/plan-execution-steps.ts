import { randomUUID } from "node:crypto";

import { upsertExecutionEntity } from "@/features/execution/logic/upsert-execution-entity";
import type {
  ExecutionPlan,
  ExecutionPlanStep,
  PlanExecutionStepsInput,
} from "@/features/execution/types/execution";

function createStep(
  input: Omit<ExecutionPlanStep, "id">,
): ExecutionPlanStep {
  return {
    id: randomUUID(),
    ...input,
  };
}

function buildTargetSummary(input: PlanExecutionStepsInput): string {
  switch (input.parsed.intent) {
    case "create_meeting":
      return `Create meeting for ${input.resolved.persons.length} person(s)`;
    case "send_reply":
      return `Send reply for ${input.resolved.threads[0]?.thread.subject ?? "target thread"}`;
    case "find_thread":
      return `Find thread for ${input.parsed.args.queryText ?? "query"}`;
    case "prepare_meeting":
      return `Prepare meeting ${input.resolved.meetings[0]?.meeting.title ?? "candidate meeting"}`;
    default:
      return "Unknown execution target";
  }
}

function buildSteps(input: PlanExecutionStepsInput): ExecutionPlanStep[] {
  switch (input.parsed.intent) {
    case "create_meeting":
      return [
        createStep({
          order: 1,
          action: "create_calendar_event",
          plugin: "googlecalendar",
          operation: "createEvent",
          description: "Create one Google Calendar event",
          payload: {
            calendarId: "primary",
            summary: input.parsed.args.queryText ?? "New meeting",
            attendees: input.resolved.persons.map((person) => ({
              email: person.email,
              displayName: person.name,
            })),
            timeHints: input.resolved.timeHints,
          },
          verification: {
            mode: "calendar_event_created",
          },
        }),
      ];
    case "send_reply":
      return input.resolved.threads[0]
        ? [
            createStep({
              order: 1,
              action: "send_gmail_reply",
              plugin: "gmail",
              operation: "sendReply",
              description: "Send one bounded Gmail reply",
              payload: {
                threadId: input.resolved.threads[0].thread.externalThreadId,
                subject: input.resolved.threads[0].thread.subject,
              },
              verification: {
                mode: "gmail_reply_sent",
              },
            }),
          ]
        : [];
    case "find_thread":
      return [
        createStep({
          order: 1,
          action: "find_gmail_thread",
          plugin: "gmail",
          operation: "findThread",
          description: "Find one Gmail thread by grounded query",
          payload: {
            query: input.parsed.args.queryText ?? "",
          },
          verification: {
            mode: "thread_found",
          },
        }),
      ];
    case "prepare_meeting":
      return input.resolved.meetings[0]
        ? [
            createStep({
              order: 1,
              action: "generate_meeting_prep",
              plugin: "internal",
              operation: "refreshMeetingPrep",
              description: "Refresh one meeting prep brief",
              payload: {
                meetingId: input.resolved.meetings[0].meeting.externalMeetingId,
              },
              verification: {
                mode: "meeting_prep_generated",
              },
            }),
          ]
        : [];
    default:
      return [];
  }
}

export async function planExecutionSteps(
  input: PlanExecutionStepsInput,
): Promise<ExecutionPlan> {
  const steps = buildSteps(input);
  const plan: ExecutionPlan = {
    id: `${input.accountId}:execution-plan:${randomUUID()}`,
    accountId: input.accountId,
    entityType: "execution_plan",
    intent: input.parsed.intent,
    targetSummary: buildTargetSummary(input),
    steps,
    version: `${input.parsed.intent}:${steps.length}:${Date.now()}`,
  };

  await upsertExecutionEntity({
    accountId: input.accountId,
    entityId: plan.id,
    entityType: plan.entityType,
    version: plan.version,
    data: plan,
  });

  return plan;
}
