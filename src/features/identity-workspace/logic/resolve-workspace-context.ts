import { DEFAULT_WORKSPACE_ROLE } from "@/features/identity-workspace/config/workspace-defaults";
import type { WorkspaceContext } from "@/features/identity-workspace/types/workspace-context";
import { getSession } from "@/server/better-auth/server";
import { corsair } from "@/server/configs/corsair";

// Canonical request-to-workspace resolver.
// All protected business logic should derive scope from here, not from UI state.
export async function resolveWorkspaceContext(): Promise<WorkspaceContext | null> {
  const session = await getSession();
  if (!session) return null;

  const userId = session.user.id;
  const workspaceId = userId;
  const tenantId = workspaceId;

  return {
    workspaceId,
    userId,
    tenantId,
    role: DEFAULT_WORKSPACE_ROLE,
    auth: {
      isAuthenticated: true,
      session,
    },
    session,
    tenant: corsair.withTenant(tenantId),
  };
}
