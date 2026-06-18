import { writeExecutionLog } from "@/features/execution";
import type { AgentChatRunContext } from "@/features/agent-chat/types/chat";

type ToolCallSummary = {
  toolCallId: string;
  toolName: string;
  input: unknown;
};

type ToolResultSummary = {
  toolCallId: string;
  toolName: string;
  output: unknown;
};

function summarizeValue(value: unknown) {
  if (value === undefined) return null;
  if (value === null) return null;

  if (typeof value === "string") {
    return value.length > 500 ? `${value.slice(0, 497)}...` : value;
  }

  try {
    const serialized = JSON.stringify(value);
    return serialized.length > 500
      ? `${serialized.slice(0, 497)}...`
      : serialized;
  } catch {
    return "[unserializable value]";
  }
}

export async function logChatToolSteps(input: {
  context: AgentChatRunContext;
  toolCalls: ToolCallSummary[];
  toolResults: ToolResultSummary[];
}) {
  if (!input.context.accountId) {
    return;
  }

  for (const toolCall of input.toolCalls) {
    const matchingResult = input.toolResults.find(
      (result) => result.toolCallId === toolCall.toolCallId,
    );

    await writeExecutionLog({
      accountId: input.context.accountId,
      runId: input.context.runId,
      stepId: toolCall.toolCallId,
      status: matchingResult ? "succeeded" : "running",
      message: `MCP tool ${toolCall.toolName}`,
      detail: {
        source: "agent-chat",
        toolName: toolCall.toolName,
        input: summarizeValue(toolCall.input),
        output: summarizeValue(matchingResult?.output),
      },
    });
  }
}
