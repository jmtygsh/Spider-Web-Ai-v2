import type {
  CommitmentExtractionResult,
  SchedulingIntentExtractionResult,
  TopicExtractionResult,
} from "@/features/extraction";
import type { MeetingPrepBrief } from "@/features/meeting-prep";
import type { MeetingProjection, ThreadProjection } from "@/features/projection-sync";

export type SuggestionEntityType =
  | "reply_suggestion"
  | "meeting_suggestion"
  | "next_best_action_suggestion";

export type ReplySuggestion = {
  id: string;
  accountId: string;
  entityType: "reply_suggestion";
  threadId: string;
  draftText: string;
  confidence: number;
  reason: string;
  version: string;
};

export type SuggestedMeetingObject = {
  summary: string;
  description: string | null;
  attendeeEmails: string[];
  suggestedStartLabel: string | null;
  suggestedEndLabel: string | null;
  calendarId: string;
};

export type MeetingSuggestion = {
  id: string;
  accountId: string;
  entityType: "meeting_suggestion";
  threadId: string;
  meeting: SuggestedMeetingObject;
  confidence: number;
  reason: string;
  version: string;
};

export type NextBestActionSuggestion = {
  id: string;
  accountId: string;
  entityType: "next_best_action_suggestion";
  action: string;
  confidence: number;
  reason: string;
  relatedMeetingId: string | null;
  relatedThreadId: string | null;
  version: string;
};

export type GenerateReplySuggestionInput = {
  accountId: string;
  thread: ThreadProjection;
  commitments?: CommitmentExtractionResult | null;
  topics?: TopicExtractionResult | null;
  prepBrief?: MeetingPrepBrief | null;
};

export type GenerateMeetingSuggestionFromEmailInput = {
  accountId: string;
  thread: ThreadProjection;
  schedulingIntent: SchedulingIntentExtractionResult;
  topics?: TopicExtractionResult | null;
};

export type GenerateNextBestActionInput = {
  accountId: string;
  threads: ThreadProjection[];
  meetings: MeetingProjection[];
  prepBriefs: MeetingPrepBrief[];
  commitmentExtractions: CommitmentExtractionResult[];
};
