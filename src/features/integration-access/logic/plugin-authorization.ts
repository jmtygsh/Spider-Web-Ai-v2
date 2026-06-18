import { generateOAuthUrl, processOAuthCallback } from "corsair/oauth";

import { REDIRECT_URI } from "@/constants/corsair";
import { CONNECT_PLUGIN_IDS, type ConnectPluginId } from "@/constants/plugins";
import { requireAuthenticatedWorkspace } from "@/features/identity-workspace";
import type { WorkspaceContext } from "@/features/identity-workspace";
import {
  INTEGRATION_AUTHORIZED_EVENT,
  OAUTH_STATE_COOKIE_NAME,
} from "@/features/integration-access/config/plugin-authorization";
import { createWorkspaceCorsairClient } from "@/features/integration-access/logic/create-workspace-corsair-client";
import type {
  PendingPluginAuthorizationState,
  PluginAuthorizationCompletionResult,
  PluginAuthorizationStartResult,
} from "@/features/integration-access/types/plugin-authorization";
import { inngest } from "@/server/configs/inngest";
import { corsair } from "@/server/configs/corsair";

export class PluginAuthorizationError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_PLUGIN"
      | "MISSING_CODE"
      | "MISSING_STATE"
      | "MISSING_PENDING_STATE"
      | "INVALID_PENDING_STATE"
      | "WORKSPACE_MISMATCH",
  ) {
    super(message);
    this.name = "PluginAuthorizationError";
  }
}

function assertConnectPluginId(pluginId: string): ConnectPluginId {
  if ((CONNECT_PLUGIN_IDS as readonly string[]).includes(pluginId)) {
    return pluginId as ConnectPluginId;
  }

  throw new PluginAuthorizationError(
    `Unsupported plugin: ${pluginId}`,
    "INVALID_PLUGIN",
  );
}

function encodePendingAuthorizationState(
  pendingState: PendingPluginAuthorizationState,
): string {
  return Buffer.from(JSON.stringify(pendingState), "utf8").toString("base64url");
}

export function decodePendingAuthorizationState(
  value: string | undefined,
): PendingPluginAuthorizationState {
  if (!value) {
    throw new PluginAuthorizationError(
      "Missing pending authorization state.",
      "MISSING_PENDING_STATE",
    );
  }

  try {
    return JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as PendingPluginAuthorizationState;
  } catch {
    throw new PluginAuthorizationError(
      "Invalid pending authorization state.",
      "INVALID_PENDING_STATE",
    );
  }
}

export async function startPluginAuthorization(input: {
  pluginId: string;
  workspace?: WorkspaceContext;
}): Promise<PluginAuthorizationStartResult> {
  const workspace = input.workspace ?? (await requireAuthenticatedWorkspace());
  const pluginId = assertConnectPluginId(input.pluginId);
  const client = await createWorkspaceCorsairClient(workspace);

  const { url, state } = await generateOAuthUrl(client, pluginId, {
    tenantId: workspace.tenantId,
    redirectUri: REDIRECT_URI,
  });

  return {
    pluginId,
    workspaceId: workspace.workspaceId,
    tenantId: workspace.tenantId,
    authorizationUrl: url,
    pendingAuthState: {
      state,
      pluginId,
      workspaceId: workspace.workspaceId,
      tenantId: workspace.tenantId,
      createdAt: new Date().toISOString(),
    },
  };
}

export async function completePluginAuthorization(input: {
  code: string | null;
  state: string | null;
  pendingStateCookieValue: string | undefined;
  workspace?: WorkspaceContext;
}): Promise<PluginAuthorizationCompletionResult> {
  const workspace = input.workspace ?? (await requireAuthenticatedWorkspace());
  const code = input.code?.trim();
  if (!code) {
    throw new PluginAuthorizationError(
      "Missing authorization code.",
      "MISSING_CODE",
    );
  }

  const returnedState = input.state?.trim();
  if (!returnedState) {
    throw new PluginAuthorizationError("Missing state.", "MISSING_STATE");
  }

  const pendingState = decodePendingAuthorizationState(
    input.pendingStateCookieValue,
  );

  if (pendingState.state !== returnedState) {
    throw new PluginAuthorizationError(
      "Invalid pending authorization state.",
      "INVALID_PENDING_STATE",
    );
  }

  if (pendingState.workspaceId !== workspace.workspaceId) {
    throw new PluginAuthorizationError(
      "Workspace mismatch during plugin authorization.",
      "WORKSPACE_MISMATCH",
    );
  }

  await processOAuthCallback(corsair, {
    code,
    state: returnedState,
    redirectUri: REDIRECT_URI,
  });

  let bootstrapRequested = false;
  let bootstrapEventIds: string[] = [];

  try {
    const eventResult = await inngest.send({
      name: INTEGRATION_AUTHORIZED_EVENT,
      id: `${workspace.workspaceId}:${pendingState.pluginId}:${returnedState}`,
      data: {
        workspaceId: workspace.workspaceId,
        tenantId: workspace.tenantId,
        userId: workspace.userId,
        pluginId: pendingState.pluginId,
        capabilityStatus: "enabled",
        pendingStateCookieName: OAUTH_STATE_COOKIE_NAME,
      },
    });

    bootstrapRequested = true;
    bootstrapEventIds = eventResult.ids;
  } catch (error) {
    console.error("Post-authorization bootstrap trigger failed:", error);
  }

  return {
    pluginId: pendingState.pluginId,
    workspaceId: workspace.workspaceId,
    tenantId: workspace.tenantId,
    status: "authorized",
    bootstrapRequested,
    bootstrapEventIds,
  };
}

export function isPluginAuthorizationError(
  error: unknown,
): error is PluginAuthorizationError {
  return error instanceof PluginAuthorizationError;
}

export { encodePendingAuthorizationState };
