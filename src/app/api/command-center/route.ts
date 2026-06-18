import { type NextRequest } from "next/server";
import { loadCommandCenterSummary } from "@/features/command-center";
import {
  isWorkspaceAuthenticationError,
  requireAuthenticatedWorkspace,
} from "@/features/identity-workspace";
import { ok, serverError, unauthorized } from "@/server/http/response";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const workspace = await requireAuthenticatedWorkspace();
    const summary = await loadCommandCenterSummary({
      tenantId: workspace.tenantId,
    });

    return ok(summary, {
      "Cache-Control": "no-store",
    });
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return unauthorized("Unauthorized");
    }

    console.error("Command center read failed:", error);
    return serverError("Command center read failed");
  }
}
