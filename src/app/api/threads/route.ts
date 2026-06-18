import { type NextRequest } from "next/server";

import {
  createAssistantThread,
  listAssistantThreads,
} from "@/features/assistant-threads";
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

export async function GET(_request: NextRequest) {
  try {
    const workspace = await requireAuthenticatedWorkspace();
    const threads = await listAssistantThreads({
      workspaceId: workspace.workspaceId,
      userId: workspace.userId,
    });

    return ok(
      {
        threads,
      },
      {
        "Cache-Control": "no-store",
      },
    );
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return unauthorized("Unauthorized");
    }

    console.error("Assistant thread list failed:", error);
    return serverError("Assistant thread list failed");
  }
}

export async function POST(request: NextRequest) {
  try {
    const workspace = await requireAuthenticatedWorkspace();
    const body = (await request.json().catch(() => ({}))) as {
      localId?: string;
    };

    const thread = await createAssistantThread({
      workspaceId: workspace.workspaceId,
      userId: workspace.userId,
      externalId: body.localId,
    });

    return ok(thread);
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return unauthorized("Unauthorized");
    }

    if (error instanceof SyntaxError) {
      return badRequest("INVALID_JSON", "Request body must be valid JSON.");
    }

    console.error("Assistant thread creation failed:", error);
    return serverError("Assistant thread creation failed");
  }
}
