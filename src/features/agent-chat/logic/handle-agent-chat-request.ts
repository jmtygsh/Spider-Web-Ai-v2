import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type ToolSet,
  type UIMessage,
} from "ai";

import { buildChatSystemPrompt } from "@/features/agent-chat/logic/build-chat-system-prompt";
import { createCorsairMcpClient } from "@/features/agent-chat/logic/create-corsair-mcp-client";
import { logChatToolSteps } from "@/features/agent-chat/logic/log-chat-tool-steps";
import { resolveChatAccountId } from "@/features/agent-chat/logic/resolve-chat-account-id";
import type {
  AgentChatRequestBody,
  AgentChatRunContext,
} from "@/features/agent-chat/types/chat";
import type { WorkspaceContext } from "@/features/identity-workspace";
import {
  formatRetrievedContext,
  retrieveRelevantContext,
} from "@/features/rag";
import { env } from "@/env";

function extractLatestUserQuery(messages: UIMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role !== "user") {
      continue;
    }

    const text = message.parts
      ?.flatMap((part) => {
        if (part.type !== "text" || typeof part.text !== "string") {
          return [];
        }

        return [part.text.trim()];
      })
      .filter(Boolean)
      .join(" ")
      .trim();

    if (text) {
      return text;
    }
  }

  return null;
}

function isAgentChatRequestBody(value: unknown): value is AgentChatRequestBody {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<AgentChatRequestBody>;
  return Array.isArray(candidate.messages);
}

export async function handleAgentChatRequest(input: {
  request: Request;
  workspace: WorkspaceContext;
}) {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const body: unknown = await input.request.json().catch(() => null);
  if (!isAgentChatRequestBody(body)) {
    throw new Error("Invalid chat request body.");
  }

  const runContext: AgentChatRunContext = {
    runId: crypto.randomUUID(),
    tenantId: input.workspace.tenantId,
    accountId: await resolveChatAccountId(input.workspace.tenantId),
  };

  const latestUserQuery = extractLatestUserQuery(body.messages);
  const ragContext =
    runContext.accountId && latestUserQuery
      ? formatRetrievedContext(
          await retrieveRelevantContext({
            accountId: runContext.accountId,
            query: latestUserQuery,
            limit: 6,
          }),
        )
      : null;

  const mcpClient = await createCorsairMcpClient({
    cookieHeader: input.request.headers.get("cookie"),
  });

  try {
    const mcpTools = await mcpClient.tools();
    const modelMessages = await convertToModelMessages(body.messages);
    const frontendToolSet = body.tools
      ? frontendTools(body.tools as Parameters<typeof frontendTools>[0])
      : {};
    const tools = {
      ...frontendToolSet,
      ...mcpTools,
    } as ToolSet;

    const result = streamText({
      model: openai("gpt-4.1"),
      system: buildChatSystemPrompt({
        forwardedSystem: body.system,
        mcpInstructions: mcpClient.instructions,
        ragContext,
      }),
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(10),
      onStepFinish: async ({ toolCalls, toolResults }) => {
        if (toolCalls.length === 0) {
          return;
        }

        await logChatToolSteps({
          context: runContext,
          toolCalls: toolCalls.map((toolCall) => ({
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            input: toolCall.input as unknown,
          })),
          toolResults: toolResults.map((toolResult) => ({
            toolCallId: toolResult.toolCallId,
            toolName: toolResult.toolName,
            output: toolResult.output as unknown,
          })),
        });
      },
      onFinish: async () => {
        await mcpClient.close();
      },
      onError: async () => {
        await mcpClient.close();
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    await mcpClient.close();
    throw error;
  }
}
