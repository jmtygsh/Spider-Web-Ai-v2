import { createHash } from "node:crypto";

import { db } from "@/server/db";
import { corsairEntities } from "@/server/db/schema";
import type { MeetingPrepEntityType } from "@/features/meeting-prep/types/meeting-prep";

function createMeetingPrepRecordId(
  accountId: string,
  entityType: MeetingPrepEntityType,
  entityId: string,
): string {
  return createHash("sha256")
    .update([accountId, entityType, entityId].join(":"))
    .digest("hex");
}

export async function upsertMeetingPrepEntity<TData extends Record<string, unknown>>(
  input: {
    accountId: string;
    entityId: string;
    entityType: MeetingPrepEntityType;
    version: string;
    data: TData;
  },
) {
  const id = createMeetingPrepRecordId(
    input.accountId,
    input.entityType,
    input.entityId,
  );

  const rows = await db
    .insert(corsairEntities)
    .values({
      id,
      accountId: input.accountId,
      entityId: input.entityId,
      entityType: input.entityType,
      version: input.version,
      data: input.data,
    })
    .onConflictDoUpdate({
      target: corsairEntities.id,
      set: {
        version: input.version,
        data: input.data,
        updatedAt: new Date(),
      },
    })
    .returning();

  return rows[0]!;
}
