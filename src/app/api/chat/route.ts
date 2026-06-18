import {
  isWorkspaceAuthenticationError,
  requireAuthenticatedWorkspace,
} from "@/features/identity-workspace";
import { handleAgentChatRequest } from "@/features/agent-chat";
import { enforceTenantRateLimit } from "@/server/http/enforce-tenant-rate-limit";
import { RATE_LIMITS } from "@/server/http/rate-limit-config";
import {
  badRequest,
  serverError,
  unauthorized,
} from "@/server/http/response";
import { captureException } from "@/server/observability/sentry";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const workspace = await requireAuthenticatedWorkspace();
    const { limited, headers } = await enforceTenantRateLimit(
      workspace.tenantId,
      "chat",
      RATE_LIMITS.chat,
    );
    if (limited) {
      return limited;
    }

    const response = await handleAgentChatRequest({
      request,
      workspace,
    });

    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }

    return response;
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

    captureException(error, { route: "/api/chat" });
    return serverError("Agent chat request failed.");
  }
}
