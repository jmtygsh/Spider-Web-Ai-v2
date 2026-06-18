import { type NextRequest } from "next/server";

import { archiveAssistantThread } from "@/features/assistant-threads";
import {
  isWorkspaceAuthenticationError,
  requireAuthenticatedWorkspace,
} from "@/features/identity-workspace";
import {
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

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const workspace = await requireAuthenticatedWorkspace();
    const { threadId } = await context.params;
    const thread = await archiveAssistantThread({
      workspaceId: workspace.workspaceId,
      userId: workspace.userId,
      threadId,
    });

    if (!thread) {
      return notFound("Assistant thread not found.");
    }

    return ok(thread);
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return unauthorized("Unauthorized");
    }

    console.error("Assistant thread archive failed:", error);
    return serverError("Assistant thread archive failed");
  }
}
