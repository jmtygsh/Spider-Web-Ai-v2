import { createHash } from "node:crypto";

import { db } from "@/server/db";
import { entityEmbeddings } from "@/server/db/schema";

function createEmbeddingId(input: {
  accountId: string;
  sourceEntityType: string;
  sourceEntityId: string;
}) {
  return createHash("sha256")
    .update(
      [
        input.accountId,
        input.sourceEntityType,
        input.sourceEntityId,
        "chunk",
      ].join(":"),
    )
    .digest("hex");
}

export async function upsertEntityEmbedding(input: {
  accountId: string;
  sourceEntityId: string;
  sourceEntityType: string;
  chunkText: string;
  embedding: number[];
}) {
  const id = createEmbeddingId(input);

  const rows = await db
    .insert(entityEmbeddings)
    .values({
      id,
      accountId: input.accountId,
      sourceEntityId: input.sourceEntityId,
      sourceEntityType: input.sourceEntityType,
      chunkText: input.chunkText,
      embedding: input.embedding,
    })
    .onConflictDoUpdate({
      target: entityEmbeddings.id,
      set: {
        chunkText: input.chunkText,
        embedding: input.embedding,
        updatedAt: new Date(),
      },
    })
    .returning();

  return rows[0]!;
}
