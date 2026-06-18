import { createHash } from "node:crypto";

import { db } from "@/server/db";
import { corsairEntities } from "@/server/db/schema";
import type { LinkingEntityType } from "@/features/linking/types/linking";

function createLinkRecordId(
  accountId: string,
  entityType: LinkingEntityType,
  entityId: string,
): string {
  return createHash("sha256")
    .update([accountId, entityType, entityId].join(":"))
    .digest("hex");
}

export async function upsertLinkEntity<TData extends Record<string, unknown>>(input: {
  accountId: string;
  entityId: string;
  entityType: LinkingEntityType;
  version: string;
  data: TData;
}) {
  const id = createLinkRecordId(input.accountId, input.entityType, input.entityId);

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
