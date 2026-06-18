import type {
  MeetingProjection,
  ProjectionParticipant,
  ThreadProjection,
} from "@/features/projection-sync";

export type LinkingEntityType =
  | "thread_meeting_link"
  | "person_anchor"
  | "person_thread_link"
  | "person_meeting_link"
  | "open_action_link";

export type LinkScoreBreakdown = {
  participantOverlapScore: number;
  subjectSimilarityScore: number;
  timingScore: number;
  topicScore: number;
  schedulingLanguageScore: number;
  totalScore: number;
};

export type ThreadMeetingLink = {
  id: string;
  accountId: string;
  entityType: "thread_meeting_link";
  threadId: string;
  meetingId: string;
  score: number;
  isLinked: boolean;
  reasons: string[];
  breakdown: LinkScoreBreakdown;
};

export type PersonAnchor = {
  id: string;
  accountId: string;
  entityType: "person_anchor";
  email: string;
  name: string | null;
  sourceCount: number;
};

export type PersonThreadLink = {
  id: string;
  accountId: string;
  entityType: "person_thread_link";
  personEmail: string;
  threadId: string;
  role: "participant";
  messageCount: number;
  lastMessageAt: string | null;
};

export type PersonMeetingLink = {
  id: string;
  accountId: string;
  entityType: "person_meeting_link";
  personEmail: string;
  meetingId: string;
  role: "organizer" | "creator" | "attendee";
  responseStatus: string | null;
  startAt: string | null;
};

export type OpenActionInput = {
  id: string;
  title: string;
  description?: string | null;
  ownerEmail?: string | null;
  participantEmails?: string[];
  dueAt?: string | null;
  relatedThreadId?: string | null;
  relatedMeetingId?: string | null;
  topics?: string[];
};

export type OpenActionLink = {
  id: string;
  accountId: string;
  entityType: "open_action_link";
  actionId: string;
  threadIds: string[];
  meetingIds: string[];
  missingOn: Array<"thread" | "meeting">;
  score: number;
  reasons: string[];
};

export type LinkThreadToMeetingInput = {
  accountId: string;
  thread: ThreadProjection;
  meeting: MeetingProjection;
};

export type LinkPersonToThreadsAndMeetingsInput = {
  accountId: string;
  threads: ThreadProjection[];
  meetings: MeetingProjection[];
};

export type LinkPersonToThreadsAndMeetingsResult = {
  persons: PersonAnchor[];
  threadLinks: PersonThreadLink[];
  meetingLinks: PersonMeetingLink[];
};

export type LinkOpenActionsInput = {
  accountId: string;
  actions: OpenActionInput[];
  threads: ThreadProjection[];
  meetings: MeetingProjection[];
};

export type LinkOpenActionsResult = {
  links: OpenActionLink[];
};

export type PersonSource =
  | (ProjectionParticipant & { sourceType: "thread" | "meeting"; role: string })
  | (ProjectionParticipant & {
      sourceType: "meeting_attendee";
      role: "attendee";
      responseStatus: string | null;
    });
