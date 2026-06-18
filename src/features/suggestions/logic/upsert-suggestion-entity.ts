import { createHash } from "node:crypto";

import { db } from "@/server/db";
import { corsairEntities } from "@/server/db/schema";
import type { SuggestionEntityType } from "@/features/suggestions/types/suggestion";

function createSuggestionEntityId(
  accountId: string,
  entityType: SuggestionEntityType,
  entityId: string,
): string {
  return createHash("sha256")
    .update([accountId, entityType, entityId].join(":"))
    .digest("hex");
}

export async function upsertSuggestionEntity<TData extends Record<string, unknown>>(
  input: {
    accountId: string;
    entityId: string;
    entityType: SuggestionEntityType;
    version: string;
    data: TData;
  },
) {
  const id = createSuggestionEntityId(
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
