import { and, eq } from "drizzle-orm";

import type { MeetingProjection, ThreadProjection } from "@/features/projection-sync";
import { db } from "@/server/db";
import { corsairEntities } from "@/server/db/schema";

type EntityRow = typeof corsairEntities.$inferSelect;

function castEntityData<T>(row: EntityRow): T {
  return row.data as T;
}

export async function loadAllMeetings(accountId: string): Promise<MeetingProjection[]> {
  const rows = await db
    .select()
    .from(corsairEntities)
    .where(
      and(
        eq(corsairEntities.accountId, accountId),
        eq(corsairEntities.entityType, "meeting_projection"),
      ),
    );

  return rows.map((row) => castEntityData<MeetingProjection>(row));
}

export async function loadAllThreads(accountId: string): Promise<ThreadProjection[]> {
  const rows = await db
    .select()
    .from(corsairEntities)
    .where(
      and(
        eq(corsairEntities.accountId, accountId),
        eq(corsairEntities.entityType, "thread_projection"),
      ),
    );

  return rows.map((row) => castEntityData<ThreadProjection>(row));
}
