import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function isLocalDevOrigin(origin: string | null): origin is string {
  if (!origin) {
    return false;
  }

  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$/i.test(
    origin,
  );
}

function withDevCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin");
  if (!isLocalDevOrigin(origin)) {
    return response;
  }

  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, mcp-session-id, Cookie, X-Requested-With",
  );
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  response.headers.set("Vary", "Origin");
  return response;
}

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.next();
  }

  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (request.method === "OPTIONS") {
    return withDevCors(request, new NextResponse(null, { status: 204 }));
  }

  return withDevCors(request, NextResponse.next());
}

export const config = {
  matcher: "/api/:path*",
};
