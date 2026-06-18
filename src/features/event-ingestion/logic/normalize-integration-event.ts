import { createHash } from "node:crypto";

import { WEBHOOK_EVENT_STATUS } from "@/features/event-ingestion/config/integration-event";
import type {
  IntegrationProvider,
  NormalizedIntegrationEvent,
  NormalizedIntegrationEventType,
  RawWebhookPayload,
} from "@/features/event-ingestion/types/integration-event";

export class IntegrationEventNormalizationError extends Error {
  constructor(
    message: string,
    readonly code:
      | "UNSUPPORTED_PROVIDER"
      | "MISSING_TENANT_ID"
      | "INVALID_GMAIL_PAYLOAD"
      | "INVALID_CALENDAR_HEADERS",
  ) {
    super(message);
    this.name = "IntegrationEventNormalizationError";
  }
}

type NormalizeIntegrationEventInput = {
  accountId: string;
  payload: RawWebhookPayload;
};

function createEventId(dedupeKey: string): string {
  return createHash("sha256").update(dedupeKey).digest("hex");
}

function decodeBase64UrlJson(value: string): Record<string, unknown> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<
    string,
    unknown
  >;
}

function normalizeGmailEvent(
  input: NormalizeIntegrationEventInput & { tenantId: string },
): NormalizedIntegrationEvent {
  const body =
    typeof input.payload.body === "object" && input.payload.body !== null
      ? (input.payload.body as Record<string, unknown>)
      : null;
  const message =
    body && typeof body.message === "object" && body.message !== null
      ? (body.message as Record<string, unknown>)
      : null;
  const encodedData =
    message && typeof message.data === "string" ? message.data : null;

  if (!encodedData) {
    throw new IntegrationEventNormalizationError(
      "Invalid Gmail webhook payload.",
      "INVALID_GMAIL_PAYLOAD",
    );
  }

  const decoded = decodeBase64UrlJson(encodedData);
  const historyId =
    typeof decoded.historyId === "string" ? decoded.historyId : null;
  const emailAddress =
    typeof decoded.emailAddress === "string" ? decoded.emailAddress : null;
  const messageId =
    typeof decoded.messageId === "string" ? decoded.messageId : null;
  const threadId =
    typeof decoded.threadId === "string" ? decoded.threadId : null;

  let eventType: NormalizedIntegrationEventType = "thread.updated";
  if (messageId) {
    eventType = "message.received";
  } else if (threadId) {
    eventType = "thread.updated";
  }

  const signal = {
    emailAddress,
    historyId,
    messageId,
    threadId,
    pubsubMessageId:
      message && typeof message.messageId === "string" ? message.messageId : null,
    publishTime:
      message && typeof message.publishTime === "string"
        ? message.publishTime
        : null,
  };

  const dedupeKey = [
    "gmail",
    input.tenantId,
    historyId ?? "unknown-history",
    signal.pubsubMessageId ?? "unknown-pubsub-message",
  ].join(":");

  return {
    id: createEventId(dedupeKey),
    dedupeKey,
    provider: "gmail",
    accountId: input.accountId,
    tenantId: input.tenantId,
    eventType,
    status: WEBHOOK_EVENT_STATUS,
    occurredAt: new Date().toISOString(),
    raw: input.payload,
    signal,
  };
}

function normalizeCalendarEvent(
  input: NormalizeIntegrationEventInput & { tenantId: string },
): NormalizedIntegrationEvent {
  const headers = input.payload.headers;
  const resourceState = headers["x-goog-resource-state"] ?? null;
  const resourceId = headers["x-goog-resource-id"] ?? null;
  const channelId = headers["x-goog-channel-id"] ?? null;
  const messageNumber = headers["x-goog-message-number"] ?? null;
  const resourceUri = headers["x-goog-resource-uri"] ?? null;

  if (!resourceState || !resourceId || !channelId || !messageNumber) {
    throw new IntegrationEventNormalizationError(
      "Invalid Google Calendar webhook headers.",
      "INVALID_CALENDAR_HEADERS",
    );
  }

  let eventType: NormalizedIntegrationEventType;
  switch (resourceState) {
    case "sync":
      eventType = "meeting.sync_requested";
      break;
    case "not_exists":
      eventType = "meeting.deleted";
      break;
    default:
      eventType = "meeting.updated";
      break;
  }

  const dedupeKey = [
    "googlecalendar",
    input.tenantId,
    channelId,
    resourceId,
    messageNumber,
  ].join(":");

  return {
    id: createEventId(dedupeKey),
    dedupeKey,
    provider: "googlecalendar",
    accountId: input.accountId,
    tenantId: input.tenantId,
    eventType,
    status: WEBHOOK_EVENT_STATUS,
    occurredAt: new Date().toISOString(),
    raw: input.payload,
    signal: {
      resourceState,
      resourceId,
      channelId,
      messageNumber,
      resourceUri,
      channelExpiration: headers["x-goog-channel-expiration"] ?? null,
      channelToken: headers["x-goog-channel-token"] ?? null,
    },
  };
}

export function inferIntegrationProvider(
  payload: RawWebhookPayload,
): IntegrationProvider {
  const provider = payload.query.provider?.toLowerCase() ?? null;
  if (provider === "gmail" || provider === "googlecalendar") {
    return provider;
  }

  if ("x-goog-resource-state" in payload.headers) {
    return "googlecalendar";
  }

  const body =
    typeof payload.body === "object" && payload.body !== null
      ? (payload.body as Record<string, unknown>)
      : null;
  const hasPubSubEnvelope =
    !!body &&
    typeof body.message === "object" &&
    body.message !== null &&
    "data" in (body.message as Record<string, unknown>);

  if (hasPubSubEnvelope) {
    return "gmail";
  }

  throw new IntegrationEventNormalizationError(
    "Unsupported integration provider.",
    "UNSUPPORTED_PROVIDER",
  );
}

export function normalizeIntegrationEvent(
  input: NormalizeIntegrationEventInput,
): NormalizedIntegrationEvent {
  const tenantId = input.payload.query.tenantId?.trim() ?? null;
  if (!tenantId) {
    throw new IntegrationEventNormalizationError(
      "Missing tenantId for webhook ingestion.",
      "MISSING_TENANT_ID",
    );
  }

  const provider = inferIntegrationProvider(input.payload);

  if (provider === "gmail") {
    return normalizeGmailEvent({ ...input, tenantId });
  }

  if (provider === "googlecalendar") {
    return normalizeCalendarEvent({ ...input, tenantId });
  }

  throw new IntegrationEventNormalizationError(
    "Unsupported integration provider.",
    "UNSUPPORTED_PROVIDER",
  );
}

export function isIntegrationEventNormalizationError(
  error: unknown,
): error is IntegrationEventNormalizationError {
  return error instanceof IntegrationEventNormalizationError;
}
