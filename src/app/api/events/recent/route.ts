import { loadRecentIntegrationEvents } from "@/features/command-execution";
import {
  isWorkspaceAuthenticationError,
  requireAuthenticatedWorkspace,
} from "@/features/identity-workspace";
import { enforceTenantRateLimit } from "@/server/http/enforce-tenant-rate-limit";
import { RATE_LIMITS } from "@/server/http/rate-limit-config";
import { ok, serverError, unauthorized } from "@/server/http/response";
import { captureException } from "@/server/observability/sentry";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const workspace = await requireAuthenticatedWorkspace();
    const { limited, headers } = await enforceTenantRateLimit(
      workspace.tenantId,
      "events-poll",
      RATE_LIMITS.eventsPoll,
    );
    if (limited) {
      return limited;
    }

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
        ...headers,
      },
    );
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return unauthorized();
    }

    captureException(error, { route: "/api/events/recent" });
    return serverError("Recent integration events load failed.");
  }
}
