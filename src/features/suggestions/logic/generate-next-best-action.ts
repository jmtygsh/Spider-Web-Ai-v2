import { upsertSuggestionEntity } from "@/features/suggestions/logic/upsert-suggestion-entity";
import type {
  GenerateNextBestActionInput,
  NextBestActionSuggestion,
} from "@/features/suggestions/types/suggestion";

function pickMeetingPrepPriority(input: GenerateNextBestActionInput) {
  const candidate = [...input.prepBriefs].sort(
    (left, right) => right.unansweredCount - left.unansweredCount,
  )[0];

  if (!candidate || candidate.unansweredCount === 0) return null;

  return {
    action: `Review prep brief and close ${candidate.unansweredCount} unanswered item(s).`,
    confidence: Number(Math.min(0.96, 0.65 + candidate.unansweredCount * 0.08).toFixed(2)),
    reason: "Meeting prep has unresolved items, so closing those gaps is the highest-value next move.",
    relatedMeetingId: candidate.meetingId,
    relatedThreadId: null,
  };
}

function pickThreadPriority(input: GenerateNextBestActionInput) {
  const openCounts = new Map(
    input.commitmentExtractions.map((entry) => [
      entry.threadId,
      entry.commitments.filter((commitment) => commitment.status === "open").length,
    ]),
  );
  const candidate = [...input.threads]
    .map((thread) => ({
      thread,
      openCount: openCounts.get(thread.externalThreadId) ?? 0,
    }))
    .sort((left, right) => right.openCount - left.openCount)[0];

  if (!candidate || candidate.openCount === 0) return null;

  return {
    action: `Reply on thread "${candidate.thread.subject ?? candidate.thread.externalThreadId}".`,
    confidence: Number(Math.min(0.91, 0.58 + candidate.openCount * 0.1).toFixed(2)),
    reason: "Open asks in email are unresolved, so the next best action is to respond or unblock the thread.",
    relatedMeetingId: null,
    relatedThreadId: candidate.thread.externalThreadId,
  };
}

function pickUpcomingMeeting(input: GenerateNextBestActionInput) {
  const candidate = [...input.meetings]
    .filter((meeting) => !meeting.isCancelled)
    .sort((left, right) =>
      String(left.startAt ?? "").localeCompare(String(right.startAt ?? "")),
    )[0];

  if (!candidate) return null;

  return {
    action: `Prepare for meeting "${candidate.title ?? candidate.externalMeetingId}".`,
    confidence: 0.62,
    reason: "There is an upcoming meeting but no stronger unresolved thread or prep signal yet.",
    relatedMeetingId: candidate.externalMeetingId,
    relatedThreadId: null,
  };
}

export async function generateNextBestAction(
  input: GenerateNextBestActionInput,
): Promise<NextBestActionSuggestion> {
  const picked =
    pickMeetingPrepPriority(input) ??
    pickThreadPriority(input) ??
    pickUpcomingMeeting(input) ?? {
      action: "Review the inbox for new activity.",
      confidence: 0.35,
      reason: "No stronger proactive signal is currently available.",
      relatedMeetingId: null,
      relatedThreadId: null,
    };

  const suggestion: NextBestActionSuggestion = {
    id: `${input.accountId}:next-best-action`,
    accountId: input.accountId,
    entityType: "next_best_action_suggestion",
    action: picked.action,
    confidence: picked.confidence,
    reason: picked.reason,
    relatedMeetingId: picked.relatedMeetingId,
    relatedThreadId: picked.relatedThreadId,
    version: `${input.threads.length}:${input.meetings.length}:${input.prepBriefs.length}:${input.commitmentExtractions.length}`,
  };

  await upsertSuggestionEntity({
    accountId: input.accountId,
    entityId: "workspace",
    entityType: suggestion.entityType,
    version: suggestion.version,
    data: suggestion,
  });

  return suggestion;
}
