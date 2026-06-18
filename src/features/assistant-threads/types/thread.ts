import type { ThreadMessage } from "@assistant-ui/react";

export type AssistantThreadStatus = "regular" | "archived";

export type AssistantThreadListItem = {
  id: string;
  title: string;
  status: AssistantThreadStatus;
  archived: boolean;
  externalId: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssistantThreadMessageRecord = {
  id: string;
  parentId: string | null;
  createdAt: string;
  message: ThreadMessage;
};
