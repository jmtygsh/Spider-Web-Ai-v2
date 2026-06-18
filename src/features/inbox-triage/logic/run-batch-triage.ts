import { and, eq } from "drizzle-orm";

import { runAiThreadTriage } from "@/features/inbox-triage/logic/run-ai-thread-triage";
import type { ThreadProjection } from "@/features/projection-sync";
import { db } from "@/server/db";
import { corsairEntities } from "@/server/db/schema";

type EntityRow = typeof corsairEntities.$inferSelect;

function castEntityData<T>(row: EntityRow): T {
  return row.data as T;
}

export async function runBatchTriage(input: {
  accountId: string;
  limit?: number;
}) {
  const rows = await db
    .select()
    .from(corsairEntities)
    .where(
      and(
        eq(corsairEntities.accountId, input.accountId),
        eq(corsairEntities.entityType, "thread_projection"),
        eq(corsairEntities.isRead, false),
      ),
    )
    .limit(input.limit ?? 8);

  const results = [];

  for (const row of rows) {
    const thread = castEntityData<ThreadProjection>(row);
    const result = await runAiThreadTriage({
      accountId: input.accountId,
      thread,
    });

    if (!result.skipped) {
      results.push(result);
    }
  }

  return {
    scanned: results.length,
    skippedMissingKey: rows.length === 0 ? 0 : undefined,
  };
}
