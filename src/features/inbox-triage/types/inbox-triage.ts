import type { ThreadProjection } from "@/features/projection-sync";

export type InboxTriageBucket =
  | "action_required"
  | "schedule"
  | "fyi"
  | "later";

export type InboxTriageItem = {
  thread: ThreadProjection;
  bucket: InboxTriageBucket;
  reason: string;
  confidence: number;
  source: "ai" | "rules";
  isAiImportant: boolean;
};

export type InboxTriageView = {
  actionRequired: InboxTriageItem[];
  schedule: InboxTriageItem[];
  fyi: InboxTriageItem[];
  later: InboxTriageItem[];
};
