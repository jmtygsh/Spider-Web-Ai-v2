import { createHash } from "node:crypto";

import { db } from "@/server/db";
import { corsairEntities } from "@/server/db/schema";
import type { ProjectionEntityType } from "@/features/projection-sync/types/projection";

function createProjectionRecordId(
  accountId: string,
  entityType: ProjectionEntityType,
  entityId: string,
): string {
  return createHash("sha256")
    .update([accountId, entityType, entityId].join(":"))
    .digest("hex");
}

export async function upsertProjectionEntity<TData extends Record<string, unknown>>(
  input: {
    accountId: string;
    entityId: string;
    entityType: ProjectionEntityType;
    version: string;
    data: TData;
  },
) {
  const id = createProjectionRecordId(
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
