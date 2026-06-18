import { type NextRequest } from "next/server";
import type { ThreadMessage } from "@assistant-ui/react";

import {
  appendAssistantMessage,
  loadAssistantMessages,
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
    const messages = await loadAssistantMessages({
      workspaceId: workspace.workspaceId,
      userId: workspace.userId,
      threadId,
    });

    if (!messages) {
      return notFound("Assistant thread not found.");
    }

    return ok(
      {
        messages,
      },
      {
        "Cache-Control": "no-store",
      },
    );
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return unauthorized("Unauthorized");
    }

    console.error("Assistant thread message load failed:", error);
    return serverError("Assistant thread message load failed");
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const workspace = await requireAuthenticatedWorkspace();
    const { threadId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      parentId?: string | null;
      message?: ThreadMessage;
    };

    if (!body.message || typeof body.message !== "object") {
      return badRequest("INVALID_MESSAGE", "A thread message is required.");
    }

    if (
      body.message.role !== "assistant" &&
      body.message.role !== "system" &&
      body.message.role !== "user"
    ) {
      return badRequest("INVALID_ROLE", "Thread message role is invalid.");
    }

    const stored = await appendAssistantMessage({
      workspaceId: workspace.workspaceId,
      userId: workspace.userId,
      threadId,
      parentId: body.parentId,
      message: body.message,
    });

    if (!stored) {
      return notFound("Assistant thread not found.");
    }

    return ok(stored);
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return unauthorized("Unauthorized");
    }

    if (error instanceof SyntaxError) {
      return badRequest("INVALID_JSON", "Request body must be valid JSON.");
    }

    console.error("Assistant thread message append failed:", error);
    return serverError("Assistant thread message append failed");
  }
}
