export { dedupeEvent } from "@/features/event-ingestion/logic/dedupe-event";
export {
  ingestCorsairWebhookEvent,
  isCorsairWebhookIngestionError,
  CorsairWebhookIngestionError,
} from "@/features/event-ingestion/logic/ingest-corsair-webhook-event";
export {
  normalizeIntegrationEvent,
  isIntegrationEventNormalizationError,
  inferIntegrationProvider,
  IntegrationEventNormalizationError,
} from "@/features/event-ingestion/logic/normalize-integration-event";
export type {
  DedupeEventDecision,
  IngestedCorsairWebhookEvent,
  IntegrationProvider,
  NormalizedIntegrationEvent,
  NormalizedIntegrationEventType,
  RawWebhookPayload,
} from "@/features/event-ingestion/types/integration-event";
