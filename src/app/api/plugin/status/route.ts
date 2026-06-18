import { type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { corsairAccounts, corsairIntegrations } from "@/server/db/schema";

import { CONNECT_PLUGIN_IDS, type ConnectPluginId } from "@/constants/plugins";
import {
  isWorkspaceAuthenticationError,
  requireAuthenticatedWorkspace,
} from "@/features/identity-workspace";
import { ok, serverError, unauthorized } from "@/server/http/response";
import { db } from "@/server/db";

export async function GET(_req: NextRequest) {
  try {
    const workspace = await requireAuthenticatedWorkspace();

    const integrations = await db
      .selectDistinct({
        name: corsairIntegrations.name,
      })
      .from(corsairAccounts)
      .innerJoin(
        corsairIntegrations,
        eq(corsairAccounts.integrationId, corsairIntegrations.id),
      )
      .where(eq(corsairAccounts.tenantId, workspace.tenantId));

    const connectedIntegrations = new Set(
      integrations.map(({ name }) => name.toLowerCase()),
    );

    const status = Object.fromEntries(
      CONNECT_PLUGIN_IDS.map((pluginId) => [
        pluginId,
        connectedIntegrations.has(pluginId),
      ]),
    ) as Record<ConnectPluginId, boolean>;

    return ok(status);
  } catch (err) {
    if (isWorkspaceAuthenticationError(err)) {
      return unauthorized("Unauthorized");
    }

    console.error("Connections read failed:", err);
    return serverError("Connections read failed");
  }
}
