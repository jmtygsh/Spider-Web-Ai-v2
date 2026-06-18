import { createHash, randomUUID } from "node:crypto";

import { db } from "@/server/db";
import { corsairEntities } from "@/server/db/schema";
import type { ExecutionEntityType } from "@/features/execution/types/execution";

function createExecutionEntityId(
  accountId: string,
  entityType: ExecutionEntityType,
  entityId: string,
): string {
  return createHash("sha256")
    .update([accountId, entityType, entityId].join(":"))
    .digest("hex");
}

export async function upsertExecutionEntity<TData extends Record<string, unknown>>(
  input: {
    accountId: string;
    entityId: string;
    entityType: ExecutionEntityType;
    version: string;
    data: TData;
  },
) {
  const id = createExecutionEntityId(
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

export async function insertExecutionLogEntity<TData extends Record<string, unknown>>(
  input: {
    accountId: string;
    entityType: ExecutionEntityType;
    version: string;
    data: TData;
  },
) {
  const entityId = randomUUID();
  const id = createExecutionEntityId(
    input.accountId,
    input.entityType,
    entityId,
  );

  const rows = await db
    .insert(corsairEntities)
    .values({
      id,
      accountId: input.accountId,
      entityId,
      entityType: input.entityType,
      version: input.version,
      data: input.data,
    })
    .returning();

  return rows[0]!;
}
