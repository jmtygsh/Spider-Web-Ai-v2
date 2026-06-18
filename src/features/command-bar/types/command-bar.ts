import type { MeetingProjection, ThreadProjection } from "@/features/projection-sync";

export type CommandIntent =
  | "create_meeting"
  | "send_reply"
  | "find_thread"
  | "prepare_meeting"
  | "unknown";

export type ParsedCommandIntent = {
  raw: string;
  normalized: string;
  intent: CommandIntent;
  confidence: number;
  args: {
    queryText: string | null;
    participantHints: string[];
    timeHints: string[];
  };
};

export type ResolvedCommandPerson = {
  email: string;
  name: string | null;
  confidence: number;
};

export type ResolvedCommandMeeting = {
  meeting: MeetingProjection;
  confidence: number;
  reasons: string[];
};

export type ResolvedCommandThread = {
  thread: ThreadProjection;
  confidence: number;
  reasons: string[];
};

export type ResolvedCommandEntities = {
  persons: ResolvedCommandPerson[];
  meetings: ResolvedCommandMeeting[];
  threads: ResolvedCommandThread[];
  timeHints: string[];
};

export type CommandPreview = {
  title: string;
  summary: string;
  plannedSteps: string[];
  resolvedSummary: string[];
  safeToExecute: boolean;
};

export type ParseCommandIntentInput = {
  command: string;
};

export type ResolveCommandEntitiesInput = {
  accountId: string;
  parsed: ParsedCommandIntent;
};

export type BuildCommandPreviewInput = {
  parsed: ParsedCommandIntent;
  resolved: ResolvedCommandEntities;
};
