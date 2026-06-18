import { generateOAuthUrl } from "corsair/oauth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { unauthorized } from "@/server/http/response";
import { getCorsairTenant } from "@/server/corsair/tenant";

const REDIRECT_URI = `${env.APP_URL}/api/oauth`;

export async function GET(request: NextRequest) {
  const corsairTenant = await getCorsairTenant();
  if (!corsairTenant) {
    return unauthorized();
  }
  const { tenantId, tenant } = corsairTenant;

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
}
