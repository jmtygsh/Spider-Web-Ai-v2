import type { CommitmentExtractionResult } from "@/features/extraction";
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
import type { TimelineItem } from "@/features/timeline";

export type AgentRunEntityType = "agent_run";

export type AgentRunPurpose =
  | "command_execution"
  | "meeting_prep"
  | "batch_triage"
  | "suggestion"
  | "classification";

export type AgentRunStatus = "pending" | "running" | "succeeded" | "failed";

export type AgentReasoningResult = {
  summary: string;
  classification: string;
  confidence: number;
  nextActions: string[];
  draftText: string | null;
  structuredData: Record<string, unknown>;
};

export type AgentRun = {
  id: string;
  accountId: string;
  entityType: "agent_run";
  purpose: AgentRunPurpose;
  status: AgentRunStatus;
  model: string | null;
  relatedThreadId: string | null;
  relatedMeetingId: string | null;
  relatedPersonEmail: string | null;
  inputSummary: string;
  startedAt: string;
  finishedAt: string | null;
  contextVersion: string | null;
  outcome: AgentReasoningResult | null;
  error: string | null;
  version: string;
};

export type AgentRunContext = {
  accountId: string;
  purpose: AgentRunPurpose;
  relatedThread: ThreadProjection | null;
  relatedMeeting: MeetingProjection | null;
  relatedPerson: RelationshipProfile | null;
  prepBriefs: MeetingPrepBrief[];
  commitments: CommitmentExtractionResult[];
  suggestions: Array<
    ReplySuggestion | MeetingSuggestion | NextBestActionSuggestion
  >;
  topTimelineItems: TimelineItem[];
  version: string;
};

export type CreateAgentRunInput = {
  accountId: string;
  purpose: AgentRunPurpose;
  inputSummary: string;
  relatedThreadId?: string | null;
  relatedMeetingId?: string | null;
  relatedPersonEmail?: string | null;
  model?: string | null;
};

export type BuildRunContextInput = {
  accountId: string;
  purpose: AgentRunPurpose;
  relatedThreadId?: string | null;
  relatedMeetingId?: string | null;
  relatedPersonEmail?: string | null;
};

export type InvokeReasoningModelInput = {
  accountId: string;
  run: AgentRun;
  context: AgentRunContext;
  instruction: string;
};

export type FinalizeAgentRunInput = {
  run: AgentRun;
  status: Extract<AgentRunStatus, "succeeded" | "failed">;
  contextVersion?: string | null;
  outcome?: AgentReasoningResult | null;
  error?: string | null;
};
