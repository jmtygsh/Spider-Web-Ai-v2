import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs, type ToolSet } from "ai";

import { buildChatSystemPrompt } from "@/features/agent-chat/logic/build-chat-system-prompt";
import { createCorsairMcpClient } from "@/features/agent-chat/logic/create-corsair-mcp-client";
import { logChatToolSteps } from "@/features/agent-chat/logic/log-chat-tool-steps";
import { env } from "@/env";

export async function executeCommandWithMcp(input: {
  command: string;
  cookieHeader: string | null;
  accountId: string;
  tenantId: string;
  runId: string;
}) {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const mcpClient = await createCorsairMcpClient({
    cookieHeader: input.cookieHeader,
  });

  try {
    const tools = {
      ...(await mcpClient.tools()),
    } as ToolSet;

    const result = await generateText({
      model: openai("gpt-4.1"),
      system: buildChatSystemPrompt({
        mcpInstructions: mcpClient.instructions,
      }),
      prompt: input.command,
      tools,
      stopWhen: stepCountIs(10),
      onStepFinish: async ({ toolCalls, toolResults }) => {
        if (toolCalls.length === 0) {
          return;
        }

        await logChatToolSteps({
          context: {
            runId: input.runId,
            tenantId: input.tenantId,
            accountId: input.accountId,
          },
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
    });

    return {
      text: result.text,
      toolCalls: result.steps.flatMap((step) =>
        step.toolCalls.map((toolCall) => ({
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
        })),
      ),
    };
  } finally {
    await mcpClient.close();
  }
}
