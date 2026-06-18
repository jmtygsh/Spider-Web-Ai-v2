import { NextResponse } from "next/server";

import {
  ingestCorsairWebhookEvent,
  isCorsairWebhookIngestionError,
  isIntegrationEventNormalizationError,
} from "@/features/event-ingestion";
import { enqueueNormalizedIntegrationEvent } from "@/features/workflow";

function getLowercaseHeaders(request: Request): Record<string, string> {
  return Object.fromEntries(
    Array.from(request.headers.entries()).map(([key, value]) => [
      key.toLowerCase(),
      value,
    ]),
  );
}

function parseJsonBody(rawBody: string): unknown {
  if (!rawBody.trim()) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return { rawBody };
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const rawBody = await request.text();

    const result = await ingestCorsairWebhookEvent({
      body: parseJsonBody(rawBody),
      headers: getLowercaseHeaders(request),
      query: {
        tenantId: url.searchParams.get("tenantId"),
        provider: url.searchParams.get("provider"),
      },
    });

    let workflowRequested = false;
    let workflowEventIds: string[] = [];
    if (result.dedupe.shouldProcess) {
      try {
        const workflowResult = await enqueueNormalizedIntegrationEvent({
          event: result.event,
        });
        workflowRequested = true;
        workflowEventIds = workflowResult.ids;
      } catch (error) {
        // Problem:
        // webhook availability should not depend on downstream orchestration.
        // Why this choice:
        // persist the normalized event first, then best-effort enqueue the
        // async workflow so transient Inngest issues do not drop provider hooks.
        console.error("Workflow enqueue failed after webhook ingestion:", error);
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        eventId: result.event.id,
        eventType: result.event.eventType,
        provider: result.event.provider,
        shouldProcess: result.dedupe.shouldProcess,
        dedupeReason: result.dedupe.reason,
        workflowRequested,
        workflowEventIds,
      },
    });
  } catch (error) {
    if (
      isCorsairWebhookIngestionError(error) ||
      isIntegrationEventNormalizationError(error)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: 400 },
      );
    }

    console.error("Webhook ingestion failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "WEBHOOK_INGESTION_FAILED",
          message: "Webhook ingestion failed.",
        },
      },
      { status: 500 },
    );
  }
}
