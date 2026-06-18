import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";

import {
  cosineSimilarity,
  embedText,
} from "@/features/rag/logic/embed-text";
import { getCached, setCached } from "@/server/cache/redis-cache";
import { db } from "@/server/db";
import { entityEmbeddings } from "@/server/db/schema";

export type RetrievedContextChunk = {
  sourceEntityId: string;
  sourceEntityType: string;
  chunkText: string;
  score: number;
};

const RAG_CACHE_TTL_SECONDS = 90;

function ragCacheKey(accountId: string, query: string, limit: number) {
  const hash = createHash("sha256")
    .update(`${accountId}:${query}:${limit}`)
    .digest("hex")
    .slice(0, 24);
  return `rag:ctx:${hash}`;
}

export async function retrieveRelevantContext(input: {
  accountId: string;
  query: string;
  limit?: number;
}): Promise<RetrievedContextChunk[]> {
  const limit = input.limit ?? 6;
  const cacheKey = ragCacheKey(input.accountId, input.query, limit);
  const cached = await getCached<RetrievedContextChunk[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const queryEmbedding = await embedText(input.query);
  if (!queryEmbedding) {
    return [];
  }

  const rows = await db
    .select()
    .from(entityEmbeddings)
    .where(eq(entityEmbeddings.accountId, input.accountId))
    .limit(250);

  const chunks = rows
    .map((row) => ({
      sourceEntityId: row.sourceEntityId,
      sourceEntityType: row.sourceEntityType,
      chunkText: row.chunkText,
      score: cosineSimilarity(queryEmbedding, row.embedding),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .filter((entry) => entry.score > 0.2);

  await setCached(cacheKey, chunks, RAG_CACHE_TTL_SECONDS);
  return chunks;
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
