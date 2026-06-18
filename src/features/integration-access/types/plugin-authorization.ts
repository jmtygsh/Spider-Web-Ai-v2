import type { ConnectPluginId } from "@/constants/plugins";
import type { CorsairTenant } from "@/server/configs/corsair";

export type WorkspaceCorsairClient = CorsairTenant;

export type PendingPluginAuthorizationState = {
  state: string;
  pluginId: ConnectPluginId;
  workspaceId: string;
  tenantId: string;
  createdAt: string;
};

export type PluginAuthorizationStartResult = {
  pluginId: ConnectPluginId;
  workspaceId: string;
  tenantId: string;
  authorizationUrl: string;
  pendingAuthState: PendingPluginAuthorizationState;
};

export type PluginAuthorizationCompletionResult = {
  pluginId: ConnectPluginId;
  workspaceId: string;
  tenantId: string;
  status: "authorized";
  bootstrapRequested: boolean;
  bootstrapEventIds: string[];
};
