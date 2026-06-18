import type { CommitmentExtractionResult } from "@/features/extraction";
import type { ExecutionLogEntry } from "@/features/execution";
import type { MeetingPrepBrief } from "@/features/meeting-prep";
import type {
  MeetingProjection,
  ThreadProjection,
} from "@/features/projection-sync";
import type { RelationshipProfile } from "@/features/relationship-intelligence";
import type {
  MeetingSuggestion,
  NextBestActionSuggestion,
  ReplySuggestion,
} from "@/features/suggestions";

export type TimelineEntityType = "timeline_projection";

export type TimelineItemKind =
  | "meeting"
  | "thread"
  | "commitment"
  | "meeting_prep"
  | "suggestion"
  | "execution"
  | "relationship";

export type TimelineItem = {
  id: string;
  accountId: string;
  kind: TimelineItemKind;
  title: string;
  summary: string;
  relatedThreadId: string | null;
  relatedMeetingId: string | null;
  relatedPersonEmail: string | null;
  eventAt: string | null;
  urgencyScore: number;
  importanceScore: number;
  relevanceScore: number;
  rankScore: number;
  sourceType:
    | "meeting_projection"
    | "thread_projection"
    | "commitment_extraction"
    | "meeting_prep_brief"
    | "reply_suggestion"
    | "meeting_suggestion"
    | "next_best_action_suggestion"
    | "execution_log"
    | "relationship_profile";
};

export type TimelineProjection = {
  id: string;
  accountId: string;
  entityType: "timeline_projection";
  items: TimelineItem[];
  version: string;
};

export type TimelineSourceBundle = {
  meetings: MeetingProjection[];
  threads: ThreadProjection[];
  commitments: CommitmentExtractionResult[];
  prepBriefs: MeetingPrepBrief[];
  replySuggestions: ReplySuggestion[];
  meetingSuggestions: MeetingSuggestion[];
  nextBestActions: NextBestActionSuggestion[];
  executionLogs: ExecutionLogEntry[];
  relationshipProfiles: RelationshipProfile[];
};

export type ProjectTimelineItemsInput = {
  accountId: string;
};

export type RankTimelineItemsInput = {
  items: TimelineItem[];
};
