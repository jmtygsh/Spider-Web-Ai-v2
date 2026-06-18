import type { ThreadProjection } from "@/features/projection-sync";
import { embedText } from "@/features/rag/logic/embed-text";
import { upsertEntityEmbedding } from "@/features/rag/logic/upsert-entity-embedding";

export function buildThreadChunkText(thread: ThreadProjection) {
  return [
    thread.subject ? `Subject: ${thread.subject}` : null,
    thread.snippet ? `Snippet: ${thread.snippet}` : null,
    thread.participantEmails.length > 0
      ? `Participants: ${thread.participantEmails.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function embedThreadProjection(input: {
  accountId: string;
  thread: ThreadProjection;
}) {
  const chunkText = buildThreadChunkText(input.thread);
  if (!chunkText.trim()) {
    return { embedded: false as const };
  }

  const embedding = await embedText(chunkText);
  if (!embedding) {
    return { embedded: false as const };
  }

  await upsertEntityEmbedding({
    accountId: input.accountId,
    sourceEntityId: input.thread.externalThreadId,
    sourceEntityType: "thread_projection",
    chunkText,
    embedding,
  });

  return { embedded: true as const };
}
