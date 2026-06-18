import { upsertSuggestionEntity } from "@/features/suggestions/logic/upsert-suggestion-entity";
import type {
  GenerateMeetingSuggestionFromEmailInput,
  MeetingSuggestion,
} from "@/features/suggestions/types/suggestion";

function buildMeetingSummary(input: GenerateMeetingSuggestionFromEmailInput) {
  if (input.schedulingIntent.intent.purpose) {
    return input.schedulingIntent.intent.purpose;
  }

  return input.thread.subject
    ? `Discuss: ${input.thread.subject}`
    : "Follow-up meeting";
}

export async function generateMeetingSuggestionFromEmail(
  input: GenerateMeetingSuggestionFromEmailInput,
): Promise<MeetingSuggestion> {
  const suggestedStartLabel =
    input.schedulingIntent.intent.candidateTimeSlots[0]?.label ?? null;
  const confidence = Number(
    Math.min(
      0.97,
      input.schedulingIntent.intent.confidence +
        (input.topics?.topics.length ?? 0) * 0.03,
    ).toFixed(2),
  );
  const reason = [
    ...input.schedulingIntent.intent.reasons,
    input.schedulingIntent.intent.candidateTimeSlots.length > 0
      ? "Thread includes candidate meeting time language."
      : "Thread includes scheduling intent without a firm time slot yet.",
  ].join(" ");

  const suggestion: MeetingSuggestion = {
    id: `${input.accountId}:meeting-suggestion:${input.thread.externalThreadId}`,
    accountId: input.accountId,
    entityType: "meeting_suggestion",
    threadId: input.thread.externalThreadId,
    meeting: {
      summary: buildMeetingSummary(input),
      description:
        input.thread.snippet ??
        (input.topics?.topics.length
          ? `Topics: ${input.topics.topics.map((topic) => topic.label).join(", ")}`
          : null),
      attendeeEmails: Array.from(
        new Set(
          [
            ...input.thread.participantEmails,
            ...input.schedulingIntent.intent.participantEmails,
          ].filter(Boolean),
        ),
      ),
      suggestedStartLabel,
      suggestedEndLabel: null,
      calendarId: "primary",
    },
    confidence,
    reason,
    version: `${input.thread.version}:${input.schedulingIntent.version}:${input.topics?.version ?? "none"}`,
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
