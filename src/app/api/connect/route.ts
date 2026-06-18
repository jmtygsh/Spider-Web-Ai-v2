import { generateOAuthUrl } from "corsair/oauth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env } from "@/env";
import {
  isWorkspaceAuthenticationError,
  requireAuthenticatedWorkspace,
} from "@/features/identity-workspace";
import { unauthorized } from "@/server/http/response";
import { REDIRECT_URI } from "@/constants/corsair";

export async function GET(request: NextRequest) {
  try {
    const workspace = await requireAuthenticatedWorkspace();
    const { tenantId, tenant } = workspace;

    const plugin = new URL(request.url).searchParams.get("plugin")!;

    const { url, state } = await generateOAuthUrl(tenant, plugin, {
      tenantId,
      redirectUri: REDIRECT_URI,
    });

    const response = NextResponse.redirect(url);
    response.cookies.set("oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10,
    });
    return response;
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return unauthorized();
    }

    throw error;
  }
}
