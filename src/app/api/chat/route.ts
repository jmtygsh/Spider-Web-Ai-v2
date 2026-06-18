import OpenAI from "openai";
import { NextResponse } from "next/server";
import type {
  EasyInputMessage,
  Tool,
} from "openai/resources/responses/responses";

import { env } from "@/env";
import { unauthorized } from "@/server/http/response";
import { getCorsairTenant } from "@/server/corsair/tenant";

type ChatMessage = {
  role: "assistant" | "system" | "user";
  content?:
    | string
    | Array<{
        type: string;
        text?: string;
      }>;
};

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

function getMessageText(message: ChatMessage) {
  if (typeof message.content === "string") {
    return message.content.trim();
  }

  if (!Array.isArray(message.content)) return "";

  return message.content
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text!.trim())
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  const tenantCtx = await getCorsairTenant();
  if (!tenantCtx) return unauthorized();

  const { messages } = (await req.json()) as {
    messages: ChatMessage[];
  };

  const forwardedCookie = req.headers.get("cookie");
  const input = messages.reduce<EasyInputMessage[]>((result, message) => {
    const content = getMessageText(message);
    if (!content) return result;

    result.push({
      role: message.role,
      content,
    });

    return result;
  }, []);

  const tools: Tool[] = [
    {
      type: "mcp",
      server_label: "corsair",
      server_url: new URL("/api/mcp", env.APP_URL).toString(),
      headers: forwardedCookie ? { cookie: forwardedCookie } : undefined,
    },
  ];

  const response = await openai.responses.create({
    model: "gpt-4.1",
    input,
    tools,
  });

  return NextResponse.json({ message: response.output_text });
}
