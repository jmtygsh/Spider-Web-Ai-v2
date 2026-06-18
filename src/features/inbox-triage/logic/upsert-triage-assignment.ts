import { createHash } from "node:crypto";

import { db } from "@/server/db";
import { corsairEntities } from "@/server/db/schema";
import type { InboxTriageAssignment } from "@/features/inbox-triage/types/triage-assignment";

function createTriageAssignmentEntityId(
  accountId: string,
  threadId: string,
): string {
  return createHash("sha256")
    .update([accountId, "inbox_triage_assignment", threadId].join(":"))
    .digest("hex");
}

export async function upsertTriageAssignment(
  assignment: InboxTriageAssignment,
) {
  const id = createTriageAssignmentEntityId(
    assignment.accountId,
    assignment.threadId,
  );

  const rows = await db
    .insert(corsairEntities)
    .values({
      id,
      accountId: assignment.accountId,
      entityId: assignment.threadId,
      entityType: assignment.entityType,
      version: assignment.version,
      data: assignment,
    })
    .onConflictDoUpdate({
      target: corsairEntities.id,
      set: {
        version: assignment.version,
        data: assignment,
        updatedAt: new Date(),
      },
    })
    .returning();

  return rows[0]!;
}
