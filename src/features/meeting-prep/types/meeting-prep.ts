import type {
  CommitmentExtractionResult,
  TopicExtractionResult,
} from "@/features/extraction";
import type { OpenActionLink, ThreadMeetingLink } from "@/features/linking";
import type {
  MeetingProjection,
  MessageProjection,
  ThreadProjection,
} from "@/features/projection-sync";

export type MeetingPrepEntityType = "meeting_prep_context" | "meeting_prep_brief";

export type MeetingPrepContext = {
  id: string;
  accountId: string;
  entityType: "meeting_prep_context";
  meetingId: string;
  participants: Array<{
    email: string | null;
    name: string | null;
    role: "organizer" | "creator" | "attendee";
    responseStatus: string | null;
  }>;
  relatedThreads: ThreadProjection[];
  recentMessages: MessageProjection[];
  openAsks: CommitmentExtractionResult["commitments"];
  missingDocs: string[];
  priorTopics: string[];
  threadLinks: ThreadMeetingLink[];
  actionLinks: OpenActionLink[];
  commitmentExtractions: CommitmentExtractionResult[];
  topicExtractions: TopicExtractionResult[];
  version: string;
};

export type MeetingPrepBrief = {
  id: string;
  accountId: string;
  entityType: "meeting_prep_brief";
  meetingId: string;
  summary: string;
  unansweredCount: number;
  topics: string[];
  risks: string[];
  suggestedReply: string | null;
  nextActions: string[];
  contextVersion: string;
  version: string;
};

export type CollectMeetingPrepContextInput = {
  accountId: string;
  meeting: MeetingProjection;
};

export type GenerateMeetingPrepBriefInput = {
  accountId: string;
  meeting: MeetingProjection;
  context: MeetingPrepContext;
};

export type RefreshMeetingPrepOnChangeInput = {
  accountId: string;
  meeting: MeetingProjection;
};
