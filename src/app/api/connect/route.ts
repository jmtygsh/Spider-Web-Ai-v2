import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  isWorkspaceAuthenticationError,
  requireAuthenticatedWorkspace,
} from "@/features/identity-workspace";
import {
  encodePendingAuthorizationState,
  isPluginAuthorizationError,
  startPluginAuthorization,
} from "@/features/integration-access";
import {
  OAUTH_STATE_COOKIE_MAX_AGE_SECONDS,
  OAUTH_STATE_COOKIE_NAME,
} from "@/features/integration-access/config/plugin-authorization";
import { unauthorized } from "@/server/http/response";

export async function GET(request: NextRequest) {
  try {
    const workspace = await requireAuthenticatedWorkspace();
    const plugin = new URL(request.url).searchParams.get("plugin")!;
    const authorization = await startPluginAuthorization({
      pluginId: plugin,
      workspace,
    });

    const response = NextResponse.redirect(authorization.authorizationUrl);
    response.cookies.set(
      OAUTH_STATE_COOKIE_NAME,
      encodePendingAuthorizationState(authorization.pendingAuthState),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: OAUTH_STATE_COOKIE_MAX_AGE_SECONDS,
      },
    );
    return response;
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return unauthorized();
    }

    if (isPluginAuthorizationError(error)) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: 400 },
      );
    }

    throw error;
  }
}
