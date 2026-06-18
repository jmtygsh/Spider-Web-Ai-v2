import { resolveWorkspaceAccountId } from "@/features/integration-access";
import { previewCommand } from "@/features/command-execution";
import {
  isWorkspaceAuthenticationError,
  requireAuthenticatedWorkspace,
} from "@/features/identity-workspace";
import { enforceTenantRateLimit } from "@/server/http/enforce-tenant-rate-limit";
import { RATE_LIMITS } from "@/server/http/rate-limit-config";
import {
  badRequest,
  ok,
  serverError,
  unauthorized,
} from "@/server/http/response";
import { captureException } from "@/server/observability/sentry";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const workspace = await requireAuthenticatedWorkspace();
    const { limited, headers } = await enforceTenantRateLimit(
      workspace.tenantId,
      "command-preview",
      RATE_LIMITS.commandPreview,
    );
    if (limited) {
      return limited;
    }

    const body = (await request.json().catch(() => ({}))) as {
      command?: string;
    };

    if (!body.command || typeof body.command !== "string" || !body.command.trim()) {
      return badRequest("INVALID_COMMAND", "A non-empty command is required.");
    }

    const accountId = await resolveWorkspaceAccountId(workspace.tenantId);
    const preview = await previewCommand({
      command: body.command.trim(),
      accountId,
    });

    return ok(preview, { "Cache-Control": "no-store", ...headers });
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return unauthorized();
    }

    await captureException(error, { route: "/api/command/preview" });
    return serverError("Command preview failed.");
  }
}
