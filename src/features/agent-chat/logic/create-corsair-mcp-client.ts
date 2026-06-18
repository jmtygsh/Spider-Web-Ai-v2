import { createMCPClient } from "@ai-sdk/mcp";

import { env } from "@/env";

export async function createCorsairMcpClient(input: {
  cookieHeader: string | null;
}) {
  const headers: Record<string, string> = {};

  if (input.cookieHeader) {
    headers.cookie = input.cookieHeader;
  }

  return createMCPClient({
    clientName: "spider-web-ai-chat",
    transport: {
      type: "http",
      url: new URL("/api/mcp", env.APP_URL).toString(),
      headers,
    },
  });
}
