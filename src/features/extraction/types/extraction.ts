import type { ThreadProjection } from "@/features/projection-sync";

export type ExtractionEntityType =
  | "commitment_extraction"
  | "topic_extraction"
  | "scheduling_intent_extraction";

export type ExtractedCommitment = {
  id: string;
  title: string;
  kind: "promise" | "pending_ask";
  status: "open";
  confidence: number;
  sentence: string;
  ownerEmail: string | null;
  participantEmails: string[];
};

export type CommitmentExtractionResult = {
  id: string;
  accountId: string;
  entityType: "commitment_extraction";
  threadId: string;
  commitments: ExtractedCommitment[];
  version: string;
};

export type ExtractedTopic = {
  id: string;
  label: string;
  confidence: number;
  evidenceCount: number;
};

export type TopicExtractionResult = {
  id: string;
  accountId: string;
  entityType: "topic_extraction";
  threadId: string;
  topics: ExtractedTopic[];
  version: string;
};

export type CandidateTimeSlot = {
  label: string;
  confidence: number;
};

export type SchedulingIntent = {
  id: string;
  shouldSchedule: boolean;
  confidence: number;
  purpose: string | null;
  participantEmails: string[];
  candidateTimeSlots: CandidateTimeSlot[];
  reasons: string[];
};

export type SchedulingIntentExtractionResult = {
  id: string;
  accountId: string;
  entityType: "scheduling_intent_extraction";
  threadId: string;
  intent: SchedulingIntent;
  version: string;
};

export type ExtractCommitmentsFromThreadInput = {
  accountId: string;
  thread: ThreadProjection;
};

export type ExtractTopicsFromThreadInput = {
  accountId: string;
  thread: ThreadProjection;
};

export type ExtractSchedulingIntentInput = {
  accountId: string;
  thread: ThreadProjection;
};
