import {
  createStableExtractionId,
  extractCandidateTopics,
  getThreadText,
} from "@/features/extraction/logic/thread-extraction-helpers";
import { upsertExtractionEntity } from "@/features/extraction/logic/upsert-extraction-entity";
import type {
  ExtractTopicsFromThreadInput,
  ExtractedTopic,
  TopicExtractionResult,
} from "@/features/extraction/types/extraction";

export async function extractTopicsFromThread(
  input: ExtractTopicsFromThreadInput,
): Promise<TopicExtractionResult> {
  const haystack = getThreadText(input.thread).toLowerCase();
  const topics: ExtractedTopic[] = extractCandidateTopics(input.thread)
    .slice(0, 6)
    .map((label) => {
      const matches = haystack.includes(label.toLowerCase()) ? 1 : 0;
      const confidence = matches > 0 ? 0.75 : 0.55;

      return {
        id: createStableExtractionId("topic", input.thread.externalThreadId, label),
        label,
        confidence,
        evidenceCount: matches,
      };
    });

  const result: TopicExtractionResult = {
    id: `${input.accountId}:topics:${input.thread.externalThreadId}`,
    accountId: input.accountId,
    entityType: "topic_extraction",
    threadId: input.thread.externalThreadId,
    topics,
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
