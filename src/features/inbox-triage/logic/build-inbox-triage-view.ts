import type {
  CommitmentExtractionResult,
  SchedulingIntentExtractionResult,
} from "@/features/extraction";
import type { ThreadProjection } from "@/features/projection-sync";
import type {
  InboxTriageBucket,
  InboxTriageItem,
  InboxTriageView,
} from "@/features/inbox-triage/types/inbox-triage";
import type { InboxTriageAssignment } from "@/features/inbox-triage/types/triage-assignment";

function isUnread(thread: ThreadProjection) {
  return thread.labelIds.some((labelId) => labelId.toUpperCase() === "UNREAD");
}

function hasSchedulingIntent(
  schedulingIntent: SchedulingIntentExtractionResult | null,
) {
  if (!schedulingIntent?.intent.shouldSchedule) {
    return false;
  }

  return (
    schedulingIntent.intent.confidence >= 0.55 ||
    schedulingIntent.intent.candidateTimeSlots.length > 0
  );
}

function classifyThread(input: {
  thread: ThreadProjection;
  commitments: CommitmentExtractionResult | null;
  schedulingIntent: SchedulingIntentExtractionResult | null;
}): InboxTriageItem {
  const openCommitments =
    input.commitments?.commitments.filter(
      (commitment) => commitment.status === "open",
    ) ?? [];
  const unread = isUnread(input.thread);
  const scheduling = hasSchedulingIntent(input.schedulingIntent);

  let bucket: InboxTriageBucket = "later";
  let reason = "No immediate action detected";
  let confidence = 0.3;

  if (openCommitments.length > 0 && unread) {
    bucket = "action_required";
    reason = `${openCommitments.length} open commitment(s) need a response`;
    confidence = Math.max(
      ...openCommitments.map((commitment) => commitment.confidence),
      0.7,
    );
  } else if (scheduling) {
    bucket = "schedule";
    reason =
      input.schedulingIntent?.intent.purpose ??
      "Scheduling intent detected in thread";
    confidence = input.schedulingIntent?.intent.confidence ?? 0.6;
  } else if (unread) {
    bucket = "fyi";
    reason = "Unread thread with no tracked open asks";
    confidence = 0.5;
  }

  return {
    thread: input.thread,
    bucket,
    reason,
    confidence,
    source: "rules",
    isAiImportant: false,
  };
}

function bucketKey(bucket: InboxTriageBucket): keyof InboxTriageView {
  switch (bucket) {
    case "action_required":
      return "actionRequired";
    case "schedule":
      return "schedule";
    case "fyi":
      return "fyi";
    case "later":
      return "later";
  }
}

export function buildInboxTriageView(input: {
  threads: ThreadProjection[];
  commitments: CommitmentExtractionResult[];
  schedulingIntents: SchedulingIntentExtractionResult[];
  aiAssignments?: InboxTriageAssignment[];
}): InboxTriageView {
  const commitmentsByThread = new Map(
    input.commitments.map((commitment) => [commitment.threadId, commitment]),
  );
  const schedulingByThread = new Map(
    input.schedulingIntents.map((intent) => [intent.threadId, intent]),
  );
  const aiByThread = new Map(
    (input.aiAssignments ?? []).map((assignment) => [
      assignment.threadId,
      assignment,
    ]),
  );

  const view: InboxTriageView = {
    actionRequired: [],
    schedule: [],
    fyi: [],
    later: [],
  };

  for (const thread of input.threads) {
    const aiAssignment = aiByThread.get(thread.externalThreadId);
    const item = aiAssignment
      ? {
          thread,
          bucket: aiAssignment.bucket,
          reason: aiAssignment.reason,
          confidence: aiAssignment.confidence,
          source: "ai" as const,
          isAiImportant:
            aiAssignment.bucket === "action_required" ||
            aiAssignment.bucket === "schedule",
        }
      : classifyThread({
          thread,
          commitments: commitmentsByThread.get(thread.externalThreadId) ?? null,
          schedulingIntent:
            schedulingByThread.get(thread.externalThreadId) ?? null,
        });

    view[bucketKey(item.bucket)].push(item);
  }

  const sortItems = (left: InboxTriageItem, right: InboxTriageItem) => {
    if (right.confidence !== left.confidence) {
      return right.confidence - left.confidence;
    }

    return (
      Date.parse(right.thread.lastMessageAt ?? "") -
      Date.parse(left.thread.lastMessageAt ?? "")
    );
  };

  view.actionRequired.sort(sortItems);
  view.schedule.sort(sortItems);
  view.fyi.sort(sortItems);
  view.later.sort(sortItems);

  return view;
}
