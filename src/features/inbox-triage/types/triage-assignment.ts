import type { InboxTriageBucket } from "@/features/inbox-triage/types/inbox-triage";

export type InboxTriageAssignmentEntityType = "inbox_triage_assignment";

export type InboxTriageAssignment = {
  id: string;
  accountId: string;
  entityType: InboxTriageAssignmentEntityType;
  threadId: string;
  bucket: InboxTriageBucket;
  reason: string;
  confidence: number;
  source: "ai" | "rules";
  agentRunId: string | null;
  version: string;
};
