import type { WorkspaceRole } from "@/features/identity-workspace/types/workspace-context";

// Current app has one user-owned workspace per signed-in user.
// Keep the default role centralized so future membership logic has one home.
export const DEFAULT_WORKSPACE_ROLE: WorkspaceRole = "owner";
