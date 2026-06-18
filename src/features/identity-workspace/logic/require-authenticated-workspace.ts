import { resolveWorkspaceContext } from "@/features/identity-workspace/logic/resolve-workspace-context";
import type { WorkspaceContext } from "@/features/identity-workspace/types/workspace-context";

export class WorkspaceAuthenticationError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "WorkspaceAuthenticationError";
  }
}

export async function requireAuthenticatedWorkspace(): Promise<WorkspaceContext> {
  const workspace = await resolveWorkspaceContext();
  if (!workspace) {
    throw new WorkspaceAuthenticationError();
  }

  return workspace;
}

export function isWorkspaceAuthenticationError(
  error: unknown,
): error is WorkspaceAuthenticationError {
  return error instanceof WorkspaceAuthenticationError;
}
