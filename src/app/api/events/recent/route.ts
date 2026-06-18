import { loadRecentIntegrationEvents } from "@/features/command-execution";
import {
  isWorkspaceAuthenticationError,
  requireAuthenticatedWorkspace,
} from "@/features/identity-workspace";
import { ok, serverError, unauthorized } from "@/server/http/response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const workspace = await requireAuthenticatedWorkspace();
    const url = new URL(request.url);
    const since = url.searchParams.get("since");
    const limit = Number(url.searchParams.get("limit") ?? "20");

    const events = await loadRecentIntegrationEvents({
      tenantId: workspace.tenantId,
      since: since ?? undefined,
      limit: Number.isFinite(limit) ? limit : 20,
    });

    return ok(
      { events },
      {
        "Cache-Control": "no-store",
      },
    );
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return unauthorized();
    }

    console.error("Recent integration events load failed:", error);
    return serverError("Recent integration events load failed.");
  }
}
