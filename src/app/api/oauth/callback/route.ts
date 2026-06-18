import { NextResponse, type NextRequest } from "next/server";
import { processOAuthCallback } from "corsair/oauth";
import { corsair } from "@/server/configs/corsair";
import { REDIRECT_URI } from "@/constants/corsair";
import { redirectTo } from "@/server/http/response";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    const response = new NextResponse("Missing code or state.", {
      status: 400,
    });
    response.cookies.delete("oauth_state");
    return response;
  }

  const storedState = request.cookies.get("oauth_state")?.value;
  if (!storedState || storedState !== state) {
    const response = new NextResponse("Invalid state.", { status: 400 });
    response.cookies.delete("oauth_state");
    return response;
  }

  try {
    const result = await processOAuthCallback(corsair, {
      code,
      state,
      redirectUri: REDIRECT_URI,
    });

    const response = redirectTo("/dashboard");
    response.cookies.delete("oauth_state");
    return response;
  } catch {
    const response = new NextResponse("OAuth failed.", { status: 500 });
    response.cookies.delete("oauth_state");
    return response;
  }
}
