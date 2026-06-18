import { and, desc, eq, gt, inArray } from "drizzle-orm";

import { CONNECT_PLUGIN_IDS } from "@/constants/plugins";
import { getCached, setCached } from "@/server/cache/redis-cache";
import { db } from "@/server/db";
import {
  corsairAccounts,
  corsairEvents,
  corsairIntegrations,
} from "@/server/db/schema";

export type RecentIntegrationEvent = {
  id: string;
  eventType: string;
  accountId: string;
  status: string | null;
  createdAt: string;
};

const EVENTS_CACHE_TTL_SECONDS = 3;

function eventsCacheKey(tenantId: string, since: string | undefined, limit: number) {
  return `events:recent:${tenantId}:${since ?? "all"}:${limit}`;
}

export async function loadRecentIntegrationEvents(input: {
  tenantId: string;
  since?: string;
  limit?: number;
}): Promise<RecentIntegrationEvent[]> {
  const limit = input.limit ?? 20;
  const cacheKey = eventsCacheKey(input.tenantId, input.since, limit);
  const cached = await getCached<RecentIntegrationEvent[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const accounts = await db
    .select({ accountId: corsairAccounts.id })
    .from(corsairAccounts)
    .innerJoin(
      corsairIntegrations,
      eq(corsairAccounts.integrationId, corsairIntegrations.id),
    )
    .where(
      and(
        eq(corsairAccounts.tenantId, input.tenantId),
        inArray(corsairIntegrations.name, [...CONNECT_PLUGIN_IDS]),
      ),
    );

  const accountIds = accounts.map((account) => account.accountId);
  if (accountIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      id: corsairEvents.id,
      eventType: corsairEvents.eventType,
      accountId: corsairEvents.accountId,
      status: corsairEvents.status,
      createdAt: corsairEvents.createdAt,
    })
    .from(corsairEvents)
    .where(
      and(
        inArray(corsairEvents.accountId, accountIds),
        ...(input.since
          ? [gt(corsairEvents.createdAt, new Date(input.since))]
          : []),
      ),
    )
    .orderBy(desc(corsairEvents.createdAt))
    .limit(limit);

  const events = rows.map((row) => ({
    id: row.id,
    eventType: row.eventType,
    accountId: row.accountId,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }));

  await setCached(cacheKey, events, EVENTS_CACHE_TTL_SECONDS);
  return events;
}
