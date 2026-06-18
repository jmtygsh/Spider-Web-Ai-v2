import { resolveWorkspaceAccountId } from "@/features/integration-access";
import { previewCommand } from "@/features/command-execution";
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

export async function POST(request: Request) {
  try {
    const workspace = await requireAuthenticatedWorkspace();
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

    return ok(preview, { "Cache-Control": "no-store" });
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return unauthorized();
    }

    console.error("Command preview failed:", error);
    return serverError("Command preview failed.");
  }
}
