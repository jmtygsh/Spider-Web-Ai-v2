import type {
  CommitmentExtractionResult,
  TopicExtractionResult,
} from "@/features/extraction";
import type {
  PersonAnchor,
  PersonMeetingLink,
  PersonThreadLink,
} from "@/features/linking";
import type {
  MeetingProjection,
  MessageProjection,
  ThreadProjection,
} from "@/features/projection-sync";

export type RelationshipIntelligenceEntityType =
  | "relationship_profile"
  | "relationship_summary";

export type RelationshipProfile = {
  id: string;
  accountId: string;
  entityType: "relationship_profile";
  personEmail: string;
  personName: string | null;
  lastMeeting: MeetingProjection | null;
  emailCount: number;
  averageResponseLatencyHours: number | null;
  openRequests: string[];
  pendingTasks: string[];
  activeTopics: string[];
  threadCount: number;
  meetingCount: number;
  anchor: PersonAnchor | null;
  threadLinks: PersonThreadLink[];
  meetingLinks: PersonMeetingLink[];
  version: string;
};

export type RelationshipSummary = {
  id: string;
  accountId: string;
  entityType: "relationship_summary";
  personEmail: string;
  summary: string;
  version: string;
};

export type BuildRelationshipProfileInput = {
  accountId: string;
  personEmail: string;
};

export type SummarizeRelationshipStateInput = {
  accountId: string;
  profile: RelationshipProfile;
};

export type RelationshipProfileStoreBundle = {
  anchor: PersonAnchor | null;
  threadLinks: PersonThreadLink[];
  meetingLinks: PersonMeetingLink[];
  threads: ThreadProjection[];
  meetings: MeetingProjection[];
  messages: MessageProjection[];
  commitments: CommitmentExtractionResult[];
  topics: TopicExtractionResult[];
};
