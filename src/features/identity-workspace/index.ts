export {
  isWorkspaceAuthenticationError,
  requireAuthenticatedWorkspace,
  WorkspaceAuthenticationError,
} from "@/features/identity-workspace/logic/require-authenticated-workspace";
export { resolveWorkspaceContext } from "@/features/identity-workspace/logic/resolve-workspace-context";
export type {
  WorkspaceAuthContext,
  WorkspaceContext,
  WorkspaceRole,
  WorkspaceSession,
} from "@/features/identity-workspace/types/workspace-context";
