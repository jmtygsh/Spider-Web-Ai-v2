export const WORKFLOW_INTEGRATION_EVENT = "workflow/integration-event.received";
export const WORKFLOW_THREAD_REFRESH_EVENT =
  "workflow/projection-thread-refresh.requested";
export const WORKFLOW_MEETING_REFRESH_EVENT =
  "workflow/projection-meeting-refresh.requested";
export const WORKFLOW_MEETING_PREP_REFRESH_EVENT =
  "workflow/meeting-prep-refresh.requested";
export const WORKFLOW_RELATIONSHIP_REFRESH_EVENT =
  "workflow/relationship-refresh.requested";
export const WORKFLOW_TIMELINE_REFRESH_EVENT =
  "workflow/timeline-refresh.requested";

export const WORKFLOW_MEETING_PREP_CRON = "*/15 * * * *";
export const WORKFLOW_BATCH_TRIAGE_CRON = "0 * * * *";

export const WORKFLOW_MEETING_PREP_OFFSETS = [
  { label: "24h", minutes: 24 * 60 },
  { label: "2h", minutes: 2 * 60 },
  { label: "30m", minutes: 30 },
] as const;

export const WORKFLOW_MEETING_PREP_WINDOW_MINUTES = 15;
