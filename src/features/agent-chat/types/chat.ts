import type { UIMessage } from "ai";

export type AgentChatRequestBody = {
  messages: UIMessage[];
  system?: string;
  tools?: Record<string, unknown>;
};

export type AgentChatRunContext = {
  runId: string;
  tenantId: string;
  accountId: string | null;
};
