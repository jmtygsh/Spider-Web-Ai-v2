import { eq } from "drizzle-orm";
import { requireAuthenticatedWorkspace } from "@/features/identity-workspace";
import type { WorkspaceContext } from "@/features/identity-workspace";
import type { WorkspaceCorsairClient } from "@/features/integration-access/types/plugin-authorization";
import { db } from "@/server/db";
import { corsairAccounts } from "@/server/db/schema";
import { corsair } from "@/server/configs/corsair";

type WorkspaceCorsairClientInput =
  | WorkspaceContext
  | {
    workspace?: WorkspaceContext;
    tenantId?: string;
    accountId?: string;
  };

function isWorkspaceContext(
  value: WorkspaceCorsairClientInput | undefined,
): value is WorkspaceContext {
  return Boolean(value && "tenant" in value && "tenantId" in value);
}

async function resolveTenantId(
  input?: WorkspaceCorsairClientInput,
): Promise<string> {
  if (isWorkspaceContext(input)) {
    return input.tenantId;
  }

  if (input?.workspace) {
    return input.workspace.tenantId;
  }

  if (input?.tenantId?.trim()) {
    return input.tenantId.trim();
  }

  if (input?.accountId?.trim()) {
    const account = await db.query.corsairAccounts.findFirst({
      where: eq(corsairAccounts.id, input.accountId.trim()),
      columns: {
        tenantId: true,
      },
    });

    if (!account?.tenantId) {
      throw new Error(`Corsair account ${input.accountId} was not found.`);
    }

    return account.tenantId;
  }

  const resolvedWorkspace = await requireAuthenticatedWorkspace();
  return resolvedWorkspace.tenantId;
}

export async function createWorkspaceCorsairClient(
  input?: WorkspaceCorsairClientInput,
): Promise<WorkspaceCorsairClient> {
  if (isWorkspaceContext(input)) {
    return input.tenant;
  }

  if (input?.workspace) {
    return input.workspace.tenant;
  }

  const tenantId = await resolveTenantId(input);
  return corsair.withTenant(tenantId);
}
