import type { ToolSet } from "ai";

const READ_ONLY_MCP_TOOLS = new Set(["list_operations", "get_schema"]);

const WRITE_OPERATION_PATTERN =
  /\b(send|create|update|delete|insert|post|reply|schedule|book|cancel|draft|events\.insert|events\.update|messages\.send|threads\.modify|calendar\.events\.insert)\b/i;

const READ_OPERATION_PATTERN =
  /\b(list|get|fetch|search|find|read|query|preview|describe|list_operations|get_schema)\b/i;

function serializeToolInput(input: unknown) {
  try {
    if (input === null || input === undefined) {
      return "";
    }
    if (typeof input === "string") {
      return input.toLowerCase();
    }
    return JSON.stringify(input).toLowerCase();
  } catch {
    return "";
  }
}

export function isMcpWriteToolCall(toolName: string, input: unknown) {
  if (READ_ONLY_MCP_TOOLS.has(toolName)) {
    return false;
  }

  const serialized = serializeToolInput(input);
  const hasWriteSignal = WRITE_OPERATION_PATTERN.test(serialized);

  if (toolName !== "run_script") {
    return hasWriteSignal;
  }

  if (hasWriteSignal) {
    return true;
  }

  return !READ_OPERATION_PATTERN.test(serialized);
}

export function wrapMcpToolsWithApproval(tools: ToolSet): ToolSet {
  const wrapped: ToolSet = {};

  for (const [toolName, tool] of Object.entries(tools)) {
    if (READ_ONLY_MCP_TOOLS.has(toolName)) {
      wrapped[toolName] = tool;
      continue;
    }

    wrapped[toolName] = {
      ...tool,
      needsApproval: async (input: unknown) => isMcpWriteToolCall(toolName, input),
    };
  }

  return wrapped;
}
