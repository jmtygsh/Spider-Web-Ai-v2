import { NextResponse, type NextRequest } from "next/server";
import {
  isWorkspaceAuthenticationError,
  requireAuthenticatedWorkspace,
} from "@/features/identity-workspace";
import {
  completePluginAuthorization,
  isPluginAuthorizationError,
} from "@/features/integration-access";
import { OAUTH_STATE_COOKIE_NAME } from "@/features/integration-access/config/plugin-authorization";
import { redirectTo } from "@/server/http/response";

export async function GET(request: NextRequest) {
  try {
    const workspace = await requireAuthenticatedWorkspace();
    const { searchParams } = new URL(request.url);

    await completePluginAuthorization({
      code: searchParams.get("code"),
      state: searchParams.get("state"),
      pendingStateCookieValue: request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value,
      workspace,
    });

    const response = redirectTo("/dashboard");
    response.cookies.delete(OAUTH_STATE_COOKIE_NAME);
    return response;
  } catch (error) {
    const status = isWorkspaceAuthenticationError(error)
      ? 401
      : isPluginAuthorizationError(error)
        ? 400
        : 500;
    const response = new NextResponse(
      isWorkspaceAuthenticationError(error) || isPluginAuthorizationError(error)
        ? error.message
        : "OAuth failed.",
      { status },
    );
    response.cookies.delete(OAUTH_STATE_COOKIE_NAME);
    return response;
  }
}
