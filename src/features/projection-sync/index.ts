export {
  syncMeetingProjection,
  MeetingProjectionSyncError,
} from "@/features/projection-sync/logic/sync-meeting-projection";
export {
  syncMessageProjection,
  MessageProjectionSyncError,
} from "@/features/projection-sync/logic/sync-message-projection";
export {
  syncThreadProjection,
  ThreadProjectionSyncError,
} from "@/features/projection-sync/logic/sync-thread-projection";
export type {
  CalendarEventResource,
  GmailMessageResource,
  GmailThreadResource,
  MeetingProjection,
  MessageProjection,
  ProjectionEntityType,
  ProjectionParticipant,
  ThreadProjection,
} from "@/features/projection-sync/types/projection";
