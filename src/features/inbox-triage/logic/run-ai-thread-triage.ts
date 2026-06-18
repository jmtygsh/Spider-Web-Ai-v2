import {
  buildRunContext,
  createAgentRun,
  finalizeAgentRun,
  invokeReasoningModel,
} from "@/features/agent-runtime";
import {
  isAiImportantBucket,
  parseTriageBucket,
} from "@/features/inbox-triage/logic/parse-triage-bucket";
import { markThreadAiScanned } from "@/features/inbox-triage/logic/mark-thread-ai-scanned";
import { upsertTriageAssignment } from "@/features/inbox-triage/logic/upsert-triage-assignment";
import type { InboxTriageAssignment } from "@/features/inbox-triage/types/triage-assignment";
import type { ThreadProjection } from "@/features/projection-sync";
import { env } from "@/env";

const TRIAGE_INSTRUCTION =
  "Classify this email thread into exactly one inbox bucket: action_required, schedule, fyi, or later. " +
  "Use action_required when the user owes a reply or there is an open ask. " +
  "Use schedule when meeting coordination is needed. " +
  "Use fyi for informational unread mail. " +
  "Use later for low-priority or already handled threads. " +
  "Set classification to the bucket name and structuredData.bucket to the same value.";

export async function runAiThreadTriage(input: {
  accountId: string;
  thread: ThreadProjection;
}) {
  if (!env.OPENAI_API_KEY) {
    return { skipped: true as const, reason: "OPENAI_API_KEY is not configured." };
  }

  const run = await createAgentRun({
    accountId: input.accountId,
    purpose: "batch_triage",
    relatedThreadId: input.thread.externalThreadId,
    inputSummary: `AI triage for thread ${input.thread.subject ?? input.thread.externalThreadId}`,
  });

  try {
    const context = await buildRunContext({
      accountId: input.accountId,
      purpose: "batch_triage",
      relatedThreadId: input.thread.externalThreadId,
    });

    const outcome = await invokeReasoningModel({
      accountId: input.accountId,
      run,
      context,
      instruction: TRIAGE_INSTRUCTION,
    });

    const structuredBucket =
      typeof outcome.structuredData.bucket === "string"
        ? parseTriageBucket(outcome.structuredData.bucket)
        : null;
    const bucket =
      structuredBucket ??
      parseTriageBucket(outcome.classification) ??
      "fyi";

    const assignment: InboxTriageAssignment = {
      id: `${input.accountId}:inbox-triage:${input.thread.externalThreadId}`,
      accountId: input.accountId,
      entityType: "inbox_triage_assignment",
      threadId: input.thread.externalThreadId,
      bucket,
      reason: outcome.summary,
      confidence: outcome.confidence,
      source: "ai",
      agentRunId: run.id,
      version: `ai:${Date.now()}`,
    };

    await upsertTriageAssignment(assignment);
    await markThreadAiScanned({
      accountId: input.accountId,
      threadId: input.thread.externalThreadId,
      isImportantMarkByAi: isAiImportantBucket(bucket),
    });

    await finalizeAgentRun({
      run,
      status: "succeeded",
      contextVersion: context.version,
      outcome,
    });

    return {
      skipped: false as const,
      assignment,
      runId: run.id,
    };
  } catch (error) {
    await finalizeAgentRun({
      run,
      status: "failed",
      error: error instanceof Error ? error.message : "AI triage failed.",
    });

    throw error;
  }
}
