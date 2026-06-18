import { resolveChatAccountId } from "@/features/agent-chat";
import { executeCommand } from "@/features/command-execution";
import {
  isWorkspaceAuthenticationError,
  requireAuthenticatedWorkspace,
} from "@/features/identity-workspace";
import {
  badRequest,
  ok,
  serverError,
  unauthorized,
} from "@/server/http/response";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const workspace = await requireAuthenticatedWorkspace();
    const body = (await request.json().catch(() => ({}))) as {
      command?: string;
      forceExecute?: boolean;
    };

    if (!body.command || typeof body.command !== "string" || !body.command.trim()) {
      return badRequest("INVALID_COMMAND", "A non-empty command is required.");
    }

    const accountId = await resolveChatAccountId(workspace.tenantId);
    const result = await executeCommand({
      command: body.command.trim(),
      accountId,
      tenantId: workspace.tenantId,
      cookieHeader: request.headers.get("cookie"),
      forceExecute: body.forceExecute === true,
    });

    return ok(result, { "Cache-Control": "no-store" });
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return unauthorized();
    }

    console.error("Command execution failed:", error);
    return serverError("Command execution failed.");
  }
}
