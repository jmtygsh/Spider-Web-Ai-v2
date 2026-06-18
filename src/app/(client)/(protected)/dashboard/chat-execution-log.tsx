"use client";

import { useMemo, type FC } from "react";
import {
  useAuiState,
  type ThreadMessage,
  type ToolCallMessagePartStatus,
} from "@assistant-ui/react";
import { useShallow } from "zustand/shallow";

type ExecutionLogItem = {
  id: string;
  toolName: string;
  status: ToolCallMessagePartStatus["type"];
  summary: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isToolCallPart(
  part: unknown,
): part is {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: unknown;
  result?: unknown;
  status: ToolCallMessagePartStatus;
} {
  return (
    isRecord(part) &&
    part.type === "tool-call" &&
    typeof part.toolCallId === "string" &&
    typeof part.toolName === "string" &&
    isRecord(part.status) &&
    typeof part.status.type === "string"
  );
}

function summarizeValue(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable value]";
  }
}

function summarizeToolInput(input: unknown) {
  return summarizeValue(input) ?? "No arguments";
}

function summarizeToolResult(result: unknown) {
  return summarizeValue(result);
}

function collectExecutionLogItems(messages: readonly ThreadMessage[]) {
  const items: ExecutionLogItem[] = [];

  for (const message of messages) {
    if (message.role !== "assistant" || !Array.isArray(message.content)) {
      continue;
    }

    for (const part of message.content) {
      if (!isToolCallPart(part)) {
        continue;
      }

      const resultSummary = summarizeToolResult(part.result);
      items.push({
        id: part.toolCallId,
        toolName: part.toolName,
        status: part.status.type,
        summary: resultSummary ?? summarizeToolInput(part.args),
      });
    }
  }

  return items.slice(-6).reverse();
}

export const ChatExecutionLogPanel: FC = () => {
  const messages = useAuiState(useShallow((state) => state.thread.messages));
  const items = useMemo(
    () => collectExecutionLogItems(messages),
    [messages],
  );

  if (items.length === 0) {
    return (
      <div className="border-border bg-panel-muted/60 rounded-2xl border px-4 py-3">
        <p className="text-muted-foreground text-xs">
          Tool execution log will appear here when the assistant calls Corsair
          MCP tools.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-panel-muted/60 rounded-2xl border px-4 py-3">
      <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase">
        Execution log
      </p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-panel rounded-xl px-3 py-2 text-xs"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{item.toolName}</p>
              <span className="text-muted-foreground capitalize">
                {item.status.replace("-", " ")}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 line-clamp-3 break-all">
              {item.summary}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
