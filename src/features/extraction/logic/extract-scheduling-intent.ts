import {
  createStableExtractionId,
  extractSchedulingSignals,
  getThreadPurposeHint,
} from "@/features/extraction/logic/thread-extraction-helpers";
import { upsertExtractionEntity } from "@/features/extraction/logic/upsert-extraction-entity";
import type {
  ExtractSchedulingIntentInput,
  SchedulingIntentExtractionResult,
} from "@/features/extraction/types/extraction";

export async function extractSchedulingIntent(
  input: ExtractSchedulingIntentInput,
): Promise<SchedulingIntentExtractionResult> {
  const signals = extractSchedulingSignals(input.thread);
  const phraseScore = Math.min(0.7, signals.matchedPhrases.length * 0.2);
  const slotScore = Math.min(0.3, signals.candidateTimeSlots.length * 0.1);
  const confidence = Number(Math.min(1, phraseScore + slotScore).toFixed(4));
  const shouldSchedule =
    signals.matchedPhrases.length > 0 ||
    signals.candidateTimeSlots.length > 0;

  const result: SchedulingIntentExtractionResult = {
    id: `${input.accountId}:schedule:${input.thread.externalThreadId}`,
    accountId: input.accountId,
    entityType: "scheduling_intent_extraction",
    threadId: input.thread.externalThreadId,
    intent: {
      id: createStableExtractionId(
        "schedule",
        input.thread.externalThreadId,
        input.thread.version,
      ),
      shouldSchedule,
      confidence,
      purpose: getThreadPurposeHint(input.thread),
      participantEmails: input.thread.participantEmails,
      candidateTimeSlots: signals.candidateTimeSlots.slice(0, 5).map((label) => ({
        label,
        confidence: 0.65,
      })),
      reasons: [
        ...signals.matchedPhrases.map((phrase) => `scheduling phrase: ${phrase}`),
        ...(signals.candidateTimeSlots.length > 0
          ? ["candidate time slot mentioned"]
          : []),
      ],
    },
    version: input.thread.version,
  };

  await upsertExtractionEntity({
    accountId: input.accountId,
    entityId: input.thread.externalThreadId,
    entityType: result.entityType,
    version: result.version,
    data: result,
  });

  return result;
}
