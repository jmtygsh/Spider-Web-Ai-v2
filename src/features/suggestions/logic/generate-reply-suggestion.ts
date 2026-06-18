import { upsertSuggestionEntity } from "@/features/suggestions/logic/upsert-suggestion-entity";
import type {
  GenerateReplySuggestionInput,
  ReplySuggestion,
} from "@/features/suggestions/types/suggestion";

function buildReplyDraft(input: GenerateReplySuggestionInput) {
  const openItems =
    input.commitments?.commitments
      .filter((commitment) => commitment.status === "open")
      .slice(0, 2)
      .map((commitment) => commitment.title) ?? [];
  const topicText = input.topics?.topics.slice(0, 2).map((topic) => topic.label).join(", ");
  const prepText = input.prepBrief?.suggestedReply;

  if (prepText) {
    return prepText;
  }

  const lines = [
    `Hi,`,
    "",
    openItems.length > 0
      ? `Following up on ${openItems.join(" and ")}.`
      : `Following up on ${input.thread.subject ?? "this thread"}.`,
    topicText ? `Main topic: ${topicText}.` : null,
    "Let me know what is still needed from me.",
    "",
    "Best,",
  ].filter((value): value is string => !!value);

  return lines.join("\n");
}

export async function generateReplySuggestion(
  input: GenerateReplySuggestionInput,
): Promise<ReplySuggestion> {
  const openCount =
    input.commitments?.commitments.filter((commitment) => commitment.status === "open")
      .length ?? 0;
  const confidence = Number(
    Math.min(
      0.95,
      0.45 +
        openCount * 0.12 +
        (input.topics?.topics.length ?? 0) * 0.05 +
        (input.prepBrief ? 0.18 : 0),
    ).toFixed(2),
  );
  const reason = input.prepBrief
    ? "Meeting prep already exposes a suggested reply, so the draft is grounded in live meeting context."
    : openCount > 0
      ? `Thread contains ${openCount} open ask(s), so a short follow-up reply is likely useful.`
      : "Thread has enough subject/topic context to propose a lightweight reply draft.";

  const suggestion: ReplySuggestion = {
    id: `${input.accountId}:reply-suggestion:${input.thread.externalThreadId}`,
    accountId: input.accountId,
    entityType: "reply_suggestion",
    threadId: input.thread.externalThreadId,
    draftText: buildReplyDraft(input),
    confidence,
    reason,
    version: `${input.thread.version}:${input.commitments?.version ?? "none"}:${input.topics?.version ?? "none"}:${input.prepBrief?.version ?? "none"}`,
  };

  await upsertSuggestionEntity({
    accountId: input.accountId,
    entityId: input.thread.externalThreadId,
    entityType: suggestion.entityType,
    version: suggestion.version,
    data: suggestion,
  });

  return suggestion;
}
