import { and, eq } from "drizzle-orm";

import { dedupeEvent } from "@/features/event-ingestion/logic/dedupe-event";
import {
  inferIntegrationProvider,
  normalizeIntegrationEvent,
} from "@/features/event-ingestion/logic/normalize-integration-event";
import type {
  IngestedCorsairWebhookEvent,
  RawWebhookPayload,
} from "@/features/event-ingestion/types/integration-event";
import { db } from "@/server/db";
import {
  corsairAccounts,
  corsairEvents,
  corsairIntegrations,
} from "@/server/db/schema";

export class CorsairWebhookIngestionError extends Error {
  constructor(
    message: string,
    readonly code: "ACCOUNT_NOT_FOUND" | "NORMALIZATION_FAILED",
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "CorsairWebhookIngestionError";
  }
}

async function resolveAccountId(payload: RawWebhookPayload): Promise<string> {
  const tenantId = payload.query.tenantId?.trim() ?? null;
  const provider =
    payload.query.provider?.toLowerCase() ?? inferIntegrationProvider(payload);

  if (!tenantId) {
    throw new CorsairWebhookIngestionError(
      "Webhook account resolution requires tenantId.",
      "ACCOUNT_NOT_FOUND",
    );
  }

  const account = await db
    .select({
      accountId: corsairAccounts.id,
    })
    .from(corsairAccounts)
    .innerJoin(
      corsairIntegrations,
      eq(corsairAccounts.integrationId, corsairIntegrations.id),
    )
    .where(
      and(
        eq(corsairAccounts.tenantId, tenantId),
        eq(corsairIntegrations.name, provider),
      ),
    )
    .limit(1);

  const match = account[0];
  if (!match) {
    throw new CorsairWebhookIngestionError(
      `No Corsair account found for tenant ${tenantId} and provider ${provider}.`,
      "ACCOUNT_NOT_FOUND",
    );
  }

  return match.accountId;
}

export async function ingestCorsairWebhookEvent(
  payload: RawWebhookPayload,
): Promise<IngestedCorsairWebhookEvent> {
  const accountId = await resolveAccountId(payload);

  let event;
  try {
    event = normalizeIntegrationEvent({ accountId, payload });
  } catch (error) {
    throw new CorsairWebhookIngestionError(
      "Webhook event normalization failed.",
      "NORMALIZATION_FAILED",
      error,
    );
  }

  const dedupe = await dedupeEvent(event);
  if (!dedupe.shouldProcess) {
    return { event, dedupe };
  }

  const inserted = await db
    .insert(corsairEvents)
    .values({
      id: event.id,
      accountId: event.accountId,
      eventType: event.eventType,
      payload: {
        dedupeKey: event.dedupeKey,
        tenantId: event.tenantId,
        provider: event.provider,
        occurredAt: event.occurredAt,
        signal: event.signal,
        raw: event.raw,
      },
      status: event.status,
    })
    .onConflictDoNothing({ target: corsairEvents.id })
    .returning({ id: corsairEvents.id });

  if (inserted.length === 0) {
    return {
      event,
      dedupe: {
        shouldProcess: false,
        reason: "duplicate",
        existingEventId: event.id,
      },
    };
  }

  return { event, dedupe };
}

export function isCorsairWebhookIngestionError(
  error: unknown,
): error is CorsairWebhookIngestionError {
  return error instanceof CorsairWebhookIngestionError;
}
