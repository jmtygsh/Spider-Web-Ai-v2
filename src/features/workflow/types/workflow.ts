import type {
  IntegrationProvider,
  NormalizedIntegrationEventType,
} from "@/features/event-ingestion";
import type {
  WORKFLOW_INTEGRATION_EVENT,
  WORKFLOW_MEETING_PREP_REFRESH_EVENT,
  WORKFLOW_MEETING_REFRESH_EVENT,
  WORKFLOW_RELATIONSHIP_REFRESH_EVENT,
  WORKFLOW_THREAD_REFRESH_EVENT,
  WORKFLOW_TIMELINE_REFRESH_EVENT,
} from "@/features/workflow/config/workflow";

export type WorkflowEventName =
  | typeof WORKFLOW_INTEGRATION_EVENT
  | typeof WORKFLOW_THREAD_REFRESH_EVENT
  | typeof WORKFLOW_MEETING_REFRESH_EVENT
  | typeof WORKFLOW_MEETING_PREP_REFRESH_EVENT
  | typeof WORKFLOW_RELATIONSHIP_REFRESH_EVENT
  | typeof WORKFLOW_TIMELINE_REFRESH_EVENT;

export type WorkflowMeetingPrepOffset = "24h" | "2h" | "30m";

export type WorkflowIntegrationEventData = {
  normalizedEventId: string;
  accountId: string;
  tenantId: string;
  provider: IntegrationProvider;
  eventType: NormalizedIntegrationEventType;
  occurredAt: string;
  signal: Record<string, unknown>;
};

export type WorkflowThreadRefreshEventData = {
  accountId: string;
  tenantId: string;
  normalizedEventId: string;
  threadId: string;
  messageId: string | null;
  reason: string;
};

export type WorkflowMeetingRefreshEventData = {
  accountId: string;
  tenantId: string;
  normalizedEventId: string;
  meetingId: string | null;
  calendarId: string | null;
  reason: string;
};

export type WorkflowMeetingPrepRefreshEventData = {
  accountId: string;
  meetingId: string;
  reason: string;
  offset: WorkflowMeetingPrepOffset | null;
};

export type WorkflowRelationshipRefreshEventData = {
  accountId: string;
  personEmails: string[];
  reason: string;
};

export type WorkflowTimelineRefreshEventData = {
  accountId: string;
  reason: string;
};
