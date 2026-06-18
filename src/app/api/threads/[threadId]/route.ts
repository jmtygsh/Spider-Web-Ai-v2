import { type NextRequest } from "next/server";

import {
  deleteAssistantThread,
  getAssistantThread,
  renameAssistantThread,
} from "@/features/assistant-threads";
import {
  isWorkspaceAuthenticationError,
  requireAuthenticatedWorkspace,
} from "@/features/identity-workspace";
import {
  badRequest,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/server/http/response";

type RouteContext = {
  params: Promise<{
    threadId: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const workspace = await requireAuthenticatedWorkspace();
    const { threadId } = await context.params;
    const thread = await getAssistantThread({
      workspaceId: workspace.workspaceId,
      userId: workspace.userId,
      threadId,
    });

    if (!thread) {
      return notFound("Assistant thread not found.");
    }

    return ok(
      thread,
      {
        "Cache-Control": "no-store",
      },
    );
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return unauthorized("Unauthorized");
    }

    console.error("Assistant thread read failed:", error);
    return serverError("Assistant thread read failed");
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const workspace = await requireAuthenticatedWorkspace();
    const { threadId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
    };

    if (typeof body.title !== "string" || !body.title.trim()) {
      return badRequest("INVALID_TITLE", "A non-empty title is required.");
    }

    const thread = await renameAssistantThread({
      workspaceId: workspace.workspaceId,
      userId: workspace.userId,
      threadId,
      title: body.title,
    });

    if (!thread) {
      return notFound("Assistant thread not found.");
    }

    return ok(thread);
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return unauthorized("Unauthorized");
    }

    if (error instanceof SyntaxError) {
      return badRequest("INVALID_JSON", "Request body must be valid JSON.");
    }

    console.error("Assistant thread rename failed:", error);
    return serverError("Assistant thread rename failed");
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const workspace = await requireAuthenticatedWorkspace();
    const { threadId } = await context.params;
    const deleted = await deleteAssistantThread({
      workspaceId: workspace.workspaceId,
      userId: workspace.userId,
      threadId,
    });

    if (!deleted) {
      return notFound("Assistant thread not found.");
    }

    return ok({
      deleted: true,
    });
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return unauthorized("Unauthorized");
    }

    console.error("Assistant thread delete failed:", error);
    return serverError("Assistant thread delete failed");
  }
}
