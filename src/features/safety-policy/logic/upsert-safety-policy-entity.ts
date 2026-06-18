import { createHash } from "node:crypto";

import type { SafetyPolicyEntityType } from "@/features/safety-policy/types/safety-policy";
import { db } from "@/server/db";
import { corsairEntities } from "@/server/db/schema";

function createSafetyPolicyEntityId(
  accountId: string,
  entityType: SafetyPolicyEntityType,
  entityId: string,
): string {
  return createHash("sha256")
    .update([accountId, entityType, entityId].join(":"))
    .digest("hex");
}

export async function upsertSafetyPolicyEntity<
  TData extends Record<string, unknown>,
>(input: {
  accountId: string;
  entityId: string;
  entityType: SafetyPolicyEntityType;
  version: string;
  data: TData;
}) {
  const id = createSafetyPolicyEntityId(
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
