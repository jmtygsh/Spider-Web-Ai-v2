import type { getSession } from "@/server/better-auth/server";
import type { CorsairTenant } from "@/server/configs/corsair";

export type WorkspaceSession = Awaited<ReturnType<typeof getSession>>;

export type WorkspaceRole = "owner";

export type WorkspaceAuthContext = {
  isAuthenticated: true;
  session: NonNullable<WorkspaceSession>;
};

export type WorkspaceContext = {
  workspaceId: string;
  userId: string;
  tenantId: string;
  role: WorkspaceRole;
  auth: WorkspaceAuthContext;
  session: NonNullable<WorkspaceSession>;
  tenant: CorsairTenant;
};
