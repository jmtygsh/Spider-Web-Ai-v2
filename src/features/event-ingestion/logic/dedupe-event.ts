import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { corsairEvents } from "@/server/db/schema";
import type {
  DedupeEventDecision,
  NormalizedIntegrationEvent,
} from "@/features/event-ingestion/types/integration-event";

export async function dedupeEvent(
  event: NormalizedIntegrationEvent,
): Promise<DedupeEventDecision> {
  const existing = await db.query.corsairEvents.findFirst({
    where: eq(corsairEvents.id, event.id),
    columns: { id: true },
  });

  if (existing) {
    return {
      shouldProcess: false,
      reason: "duplicate",
      existingEventId: existing.id,
    };
  }

  return {
    shouldProcess: true,
    reason: "new",
  };
}
