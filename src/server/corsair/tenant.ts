import { resolveWorkspaceContext } from "@/features/identity-workspace";

export async function getCorsairTenant() {
  const workspace = await resolveWorkspaceContext();
  if (!workspace) return null;

  return {
    session: workspace.session,
    tenantId: workspace.tenantId,
    tenant: workspace.tenant,
  };
}
