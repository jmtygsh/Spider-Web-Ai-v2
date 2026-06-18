import { resolveWorkspaceAccountId } from "@/features/integration-access";
import { executeCommand } from "@/features/command-execution";
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
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const workspace = await requireAuthenticatedWorkspace();
    const { limited, headers } = await enforceTenantRateLimit(
      workspace.tenantId,
      "command-execute",
      RATE_LIMITS.commandExecute,
    );
    if (limited) {
      return limited;
    }

    const body = (await request.json().catch(() => ({}))) as {
      command?: string;
      forceExecute?: boolean;
    };

    if (!body.command || typeof body.command !== "string" || !body.command.trim()) {
      return badRequest("INVALID_COMMAND", "A non-empty command is required.");
    }

    const accountId = await resolveWorkspaceAccountId(workspace.tenantId);
    const result = await executeCommand({
      command: body.command.trim(),
      accountId,
      tenantId: workspace.tenantId,
      cookieHeader: request.headers.get("cookie"),
      forceExecute: body.forceExecute === true,
    });

    return ok(result, { "Cache-Control": "no-store", ...headers });
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return unauthorized();
    }

    await captureException(error, { route: "/api/command/execute" });
    return serverError("Command execution failed.");
  }
}
