import { and, eq, inArray } from "drizzle-orm";

import { CONNECT_PLUGIN_IDS } from "@/constants/plugins";
import { db } from "@/server/db";
import { corsairAccounts, corsairIntegrations } from "@/server/db/schema";

export async function resolveWorkspaceAccountId(
  tenantId: string,
): Promise<string | null> {
  const accounts = await db
    .select({
      accountId: corsairAccounts.id,
    })
    .from(corsairAccounts)
    .innerJoin(
      corsairIntegrations,
      eq(corsairAccounts.integrationId, corsairIntegrations.id),
    )
    .where(
      and(
        eq(corsairAccounts.tenantId, tenantId),
        inArray(corsairIntegrations.name, [...CONNECT_PLUGIN_IDS]),
      ),
    )
    .limit(1);

  return accounts[0]?.accountId ?? null;
}

/** @deprecated Use resolveWorkspaceAccountId */
export const resolveChatAccountId = resolveWorkspaceAccountId;
