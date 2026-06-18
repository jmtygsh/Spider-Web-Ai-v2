import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { corsairEntities } from "@/server/db/schema";

export async function markThreadAiScanned(input: {
  accountId: string;
  threadId: string;
  isImportantMarkByAi: boolean;
}) {
  await db
    .update(corsairEntities)
    .set({
      isRead: true,
      isImportantMarkByAi: input.isImportantMarkByAi,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(corsairEntities.accountId, input.accountId),
        eq(corsairEntities.entityType, "thread_projection"),
        eq(corsairEntities.entityId, input.threadId),
      ),
    );
}

export async function resetThreadAiScan(input: {
  accountId: string;
  threadId: string;
}) {
  await db
    .update(corsairEntities)
    .set({
      isRead: false,
      isImportantMarkByAi: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(corsairEntities.accountId, input.accountId),
        eq(corsairEntities.entityType, "thread_projection"),
        eq(corsairEntities.entityId, input.threadId),
      ),
    );
}
