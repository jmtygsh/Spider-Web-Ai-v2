import { requireAuthenticatedWorkspace } from "@/features/identity-workspace";
import type { WorkspaceContext } from "@/features/identity-workspace";
import type { WorkspaceCorsairClient } from "@/features/integration-access/types/plugin-authorization";

export async function createWorkspaceCorsairClient(
  workspace?: WorkspaceContext,
): Promise<WorkspaceCorsairClient> {
  if (workspace) {
    return workspace.tenant;
  }

  const resolvedWorkspace = await requireAuthenticatedWorkspace();
  return resolvedWorkspace.tenant;
}
