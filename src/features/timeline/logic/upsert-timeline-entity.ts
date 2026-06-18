import { createHash } from "node:crypto";

import { db } from "@/server/db";
import { corsairEntities } from "@/server/db/schema";

function createTimelineEntityId(accountId: string, entityId: string): string {
  return createHash("sha256")
    .update([accountId, "timeline_projection", entityId].join(":"))
    .digest("hex");
}

export async function upsertTimelineProjection<TData extends Record<string, unknown>>(
  input: {
    accountId: string;
    entityId: string;
    version: string;
    data: TData;
  },
) {
  const id = createTimelineEntityId(input.accountId, input.entityId);

  const rows = await db
    .insert(corsairEntities)
    .values({
      id,
      accountId: input.accountId,
      entityId: input.entityId,
      entityType: "timeline_projection",
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
