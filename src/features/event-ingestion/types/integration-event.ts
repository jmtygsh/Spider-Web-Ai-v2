export type IntegrationProvider = "gmail" | "googlecalendar";

export type NormalizedIntegrationEventType =
  | "thread.updated"
  | "message.received"
  | "meeting.updated"
  | "meeting.deleted"
  | "meeting.sync_requested";

export type RawWebhookPayload = {
  body: unknown;
  headers: Record<string, string>;
  query: {
    tenantId: string | null;
    provider: string | null;
  };
};

export type NormalizedIntegrationEvent = {
  id: string;
  dedupeKey: string;
  provider: IntegrationProvider;
  accountId: string;
  tenantId: string;
  eventType: NormalizedIntegrationEventType;
  status: "received";
  occurredAt: string;
  raw: RawWebhookPayload;
  signal: Record<string, unknown>;
};

export type DedupeEventDecision =
  | {
      shouldProcess: true;
      reason: "new";
    }
  | {
      shouldProcess: false;
      reason: "duplicate";
      existingEventId: string;
    };

export type IngestedCorsairWebhookEvent = {
  event: NormalizedIntegrationEvent;
  dedupe: DedupeEventDecision;
};
