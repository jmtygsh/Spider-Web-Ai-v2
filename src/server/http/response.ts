import { NextResponse } from "next/server";
import type { ApiFailure, ApiSuccess } from "@/server/types/api";
import { env } from "@/env";

// Purpose:
// Wraps a successful API response in the standard { ok: true, data } envelope.
// Called by route handlers on success paths.
// Handles response data and optional headers; expected result is a NextResponse JSON body.
export function ok<T>(data: T, headers?: HeadersInit): NextResponse {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data }, { headers });
}

// Purpose:
// Wraps an error in the standard { ok: false, error } envelope with HTTP status.
// Called by route handlers and http helpers on failure paths.
// Handles status, code, message, and optional headers; expected result is a NextResponse.
export function fail(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
): NextResponse {
  return NextResponse.json<ApiFailure>(
    { ok: false, error: { code, message } },
    { status, headers },
  );
}

// Common shortcuts so routes read consistently.
// Purpose: Returns a 401 Unauthorized JSON response. Used when session is missing or invalid.
export const unauthorized = (message = "Unauthorized", headers?: HeadersInit) =>
  fail(401, "UNAUTHORIZED", message, headers);

// Purpose: Returns a 400 Bad Request JSON response with a custom error code.
export const badRequest = (
  code: string,
  message: string,
  headers?: HeadersInit,
) => fail(400, code, message, headers);

// Purpose: Returns a 404 Not Found JSON response.
export const notFound = (message = "Not found", headers?: HeadersInit) =>
  fail(404, "NOT_FOUND", message, headers);

// Purpose: Returns a 413 Payload Too Large JSON response.
export const payloadTooLarge = (message: string, headers?: HeadersInit) =>
  fail(413, "PAYLOAD_TOO_LARGE", message, headers);

// Purpose: Returns a 500 Internal Server Error JSON response.
export const serverError = (
  message = "Internal server error",
  headers?: HeadersInit,
) => fail(500, "INTERNAL", message, headers);

// an special case
export const redirectTo = (
  url: string,
  headers?: HeadersInit,
): NextResponse => {
  // Ensure we handle the slash cleanly between APP_URL and the target url
  const targetUrl = new URL(url, env.APP_URL);
  return NextResponse.redirect(targetUrl, { headers });
};
