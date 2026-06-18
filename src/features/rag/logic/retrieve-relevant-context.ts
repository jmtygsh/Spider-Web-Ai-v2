import { eq } from "drizzle-orm";

import {
  cosineSimilarity,
  embedText,
} from "@/features/rag/logic/embed-text";
import { db } from "@/server/db";
import { entityEmbeddings } from "@/server/db/schema";

export type RetrievedContextChunk = {
  sourceEntityId: string;
  sourceEntityType: string;
  chunkText: string;
  score: number;
};

export async function retrieveRelevantContext(input: {
  accountId: string;
  query: string;
  limit?: number;
}): Promise<RetrievedContextChunk[]> {
  const queryEmbedding = await embedText(input.query);
  if (!queryEmbedding) {
    return [];
  }

  const rows = await db
    .select()
    .from(entityEmbeddings)
    .where(eq(entityEmbeddings.accountId, input.accountId))
    .limit(250);

  return rows
    .map((row) => ({
      sourceEntityId: row.sourceEntityId,
      sourceEntityType: row.sourceEntityType,
      chunkText: row.chunkText,
      score: cosineSimilarity(queryEmbedding, row.embedding),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, input.limit ?? 6)
    .filter((entry) => entry.score > 0.2);
}

export function formatRetrievedContext(chunks: RetrievedContextChunk[]) {
  if (chunks.length === 0) {
    return null;
  }

  return chunks
    .map(
      (chunk, index) =>
        `[${index + 1}] (${chunk.sourceEntityType}:${chunk.sourceEntityId}, score=${chunk.score.toFixed(2)})\n${chunk.chunkText}`,
    )
    .join("\n\n");
}
