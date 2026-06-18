import {
  createStableExtractionId,
  getThreadText,
  splitIntoSentences,
} from "@/features/extraction/logic/thread-extraction-helpers";
import { upsertExtractionEntity } from "@/features/extraction/logic/upsert-extraction-entity";
import type {
  CommitmentExtractionResult,
  ExtractCommitmentsFromThreadInput,
  ExtractedCommitment,
} from "@/features/extraction/types/extraction";

const PROMISE_PATTERNS = [
  /\b(?:i[' ]?ll|we[' ]?ll|i am going to|we are going to|let me|i can|we can)\s+([^.!?\n]+)/i,
  /\b(?:i will|we will)\s+([^.!?\n]+)/i,
];

const PENDING_ASK_PATTERNS = [
  /\b(?:can you|could you|would you|please|need you to)\s+([^.!?\n]+)/i,
  /\b(?:can we|could we)\s+([^.!?\n]+)/i,
];

function cleanCommitmentTitle(value: string): string {
  return value
    .replace(/^(?:please|kindly)\s+/i, "")
    .replace(/\b(?:for me|for us|when you can)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMatches(
  sentence: string,
  patterns: RegExp[],
  kind: ExtractedCommitment["kind"],
  participantEmails: string[],
): ExtractedCommitment[] {
  return patterns
    .map((pattern) => sentence.match(pattern))
    .filter((match): match is RegExpMatchArray => !!match?.[1])
    .map((match) => {
      const title = cleanCommitmentTitle(match[1] ?? sentence);
      return {
        id: createStableExtractionId(kind, sentence, title),
        title,
        kind,
        status: "open" as const,
        confidence: kind === "promise" ? 0.8 : 0.72,
        sentence,
        ownerEmail: null,
        participantEmails,
      };
    });
}

export async function extractCommitmentsFromThread(
  input: ExtractCommitmentsFromThreadInput,
): Promise<CommitmentExtractionResult> {
  const sentences = splitIntoSentences(getThreadText(input.thread));
  const commitments = Array.from(
    new Map(
      sentences
        .flatMap((sentence) => [
          ...extractMatches(
            sentence,
            PROMISE_PATTERNS,
            "promise",
            input.thread.participantEmails,
          ),
          ...extractMatches(
            sentence,
            PENDING_ASK_PATTERNS,
            "pending_ask",
            input.thread.participantEmails,
          ),
        ])
        .map((commitment) => [commitment.id, commitment] as const),
    ).values(),
  );

  const result: CommitmentExtractionResult = {
    id: `${input.accountId}:commitments:${input.thread.externalThreadId}`,
    accountId: input.accountId,
    entityType: "commitment_extraction",
    threadId: input.thread.externalThreadId,
    commitments,
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
