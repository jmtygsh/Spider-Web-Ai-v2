import { type NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import {
  isWorkspaceAuthenticationError,
  requireAuthenticatedWorkspace,
} from "@/features/identity-workspace";
import { INTEGRATION_AUTHORIZED_EVENT } from "@/features/integration-access/config/plugin-authorization";
import { ok, serverError, unauthorized } from "@/server/http/response";
import { inngest } from "@/server/configs/inngest";
import { db } from "@/server/db";
import { corsairAccounts, corsairIntegrations } from "@/server/db/schema";
import { CONNECT_PLUGIN_IDS, type ConnectPluginId } from "@/constants/plugins";

async function requestBootstrap() {
  const workspace = await requireAuthenticatedWorkspace();
  const accounts = await db
    .select({
      pluginId: corsairIntegrations.name,
    })
    .from(corsairAccounts)
    .innerJoin(
      corsairIntegrations,
      eq(corsairAccounts.integrationId, corsairIntegrations.id),
    )
    .where(
      and(
        eq(corsairAccounts.tenantId, workspace.tenantId),
        inArray(corsairIntegrations.name, [...CONNECT_PLUGIN_IDS]),
      ),
    );

  const connectedPlugins = Array.from(
    new Set(
      accounts
        .map((account) => account.pluginId)
        .filter(
          (pluginId): pluginId is ConnectPluginId =>
            CONNECT_PLUGIN_IDS.includes(pluginId as ConnectPluginId),
        ),
    ),
  );

  if (connectedPlugins.length === 0) {
    return ok({
      requested: false,
      eventIds: [],
      plugins: [],
    });
  }

  const result = await inngest.send(
    connectedPlugins.map((pluginId) => ({
      name: INTEGRATION_AUTHORIZED_EVENT,
      data: {
        pluginId,
        workspaceId: workspace.workspaceId,
        tenantId: workspace.tenantId,
        capabilityStatus: "sync_requested" as const,
      },
    })),
  );

  return ok({
    requested: true,
    eventIds: result.ids,
    plugins: connectedPlugins,
  });
}

export async function GET(_req: NextRequest) {
  try {
    return await requestBootstrap();
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return unauthorized("Unauthorized");
    }

    console.error("Connections sync failed:", error);
    return serverError("Connections sync failed");
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
