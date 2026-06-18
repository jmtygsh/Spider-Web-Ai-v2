import {
  isWorkspaceAuthenticationError,
  requireAuthenticatedWorkspace,
} from "@/features/identity-workspace";
import { handleAgentChatRequest } from "@/features/agent-chat";
import {
  badRequest,
  serverError,
  unauthorized,
} from "@/server/http/response";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const workspace = await requireAuthenticatedWorkspace();
    return await handleAgentChatRequest({
      request,
      workspace,
    });
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return unauthorized();
    }

    if (error instanceof Error) {
      if (error.message === "Invalid chat request body.") {
        return badRequest("INVALID_CHAT_BODY", error.message);
      }

      if (error.message === "OPENAI_API_KEY is not configured.") {
        return serverError(error.message);
      }
    }

    console.error("Agent chat request failed:", error);
    return serverError("Agent chat request failed.");
  }
}
