export { embedText, cosineSimilarity } from "@/features/rag/logic/embed-text";
export { embedThreadProjection } from "@/features/rag/logic/embed-thread-projection";
export {
  formatRetrievedContext,
  retrieveRelevantContext,
  type RetrievedContextChunk,
} from "@/features/rag/logic/retrieve-relevant-context";
export { upsertEntityEmbedding } from "@/features/rag/logic/upsert-entity-embedding";
