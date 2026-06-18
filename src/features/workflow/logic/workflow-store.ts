import { and, eq } from "drizzle-orm";

import type {
  MeetingProjection,
  ThreadProjection,
} from "@/features/projection-sync";
import { db } from "@/server/db";
import { corsairAccounts, corsairEntities } from "@/server/db/schema";

type EntityRow = typeof corsairEntities.$inferSelect;

function castEntityData<T>(row: EntityRow): T {
  return row.data as T;
}

export async function loadWorkflowAccountIds(): Promise<string[]> {
  const rows = await db
    .select({ id: corsairAccounts.id })
    .from(corsairAccounts);

  return rows.map((row) => row.id);
}

export async function loadThreadProjection(input: {
  accountId: string;
  threadId: string;
}): Promise<ThreadProjection | null> {
  const row = await db.query.corsairEntities.findFirst({
    where: and(
      eq(corsairEntities.accountId, input.accountId),
      eq(corsairEntities.entityType, "thread_projection"),
      eq(corsairEntities.entityId, input.threadId),
    ),
  });

  return row ? castEntityData<ThreadProjection>(row) : null;
}

export async function loadMeetingProjection(input: {
  accountId: string;
  meetingId: string;
}): Promise<MeetingProjection | null> {
  const row = await db.query.corsairEntities.findFirst({
    where: and(
      eq(corsairEntities.accountId, input.accountId),
      eq(corsairEntities.entityType, "meeting_projection"),
      eq(corsairEntities.entityId, input.meetingId),
    ),
  });

  return row ? castEntityData<MeetingProjection>(row) : null;
}

export async function loadAllThreadProjections(
  accountId: string,
): Promise<ThreadProjection[]> {
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

export async function loadAllMeetingProjections(
  accountId: string,
): Promise<MeetingProjection[]> {
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
