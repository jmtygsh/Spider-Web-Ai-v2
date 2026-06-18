import { createHash } from "node:crypto";

import { db } from "@/server/db";
import { corsairEntities } from "@/server/db/schema";
import type { RelationshipIntelligenceEntityType } from "@/features/relationship-intelligence/types/relationship-intelligence";

function createRelationshipEntityId(
  accountId: string,
  entityType: RelationshipIntelligenceEntityType,
  entityId: string,
): string {
  return createHash("sha256")
    .update([accountId, entityType, entityId].join(":"))
    .digest("hex");
}

export async function upsertRelationshipEntity<
  TData extends Record<string, unknown>,
>(input: {
  accountId: string;
  entityId: string;
  entityType: RelationshipIntelligenceEntityType;
  version: string;
  data: TData;
}) {
  const id = createRelationshipEntityId(
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
