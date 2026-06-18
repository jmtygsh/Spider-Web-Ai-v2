import type {
  ExportedMessageRepositoryItem,
  GenericThreadHistoryAdapter,
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/react";
import type { UIMessage } from "ai";

import type { AssistantThreadMessageRecord } from "@/features/assistant-threads";
import type { ApiResponse } from "@/server/types/api";

type AssistantThreadMessagesResponse = {
  messages: AssistantThreadMessageRecord[];
};

type ThreadListItemClient = {
  getState: () => { remoteId?: string | null };
  initialize: () => Promise<{ remoteId: string }>;
};

type AssistantHistoryContext = {
  threadListItem: () => ThreadListItemClient;
};

async function readApiData<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.ok) {
    throw new Error(
      payload.ok ? `Request failed: ${response.status}` : payload.error.message,
    );
  }

  return payload.data;
}

function isUIMessage(value: unknown): value is UIMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "role" in value &&
    "parts" in value &&
    Array.isArray((value as UIMessage).parts)
  );
}

function isTextMessagePart(
  part: unknown,
): part is { type: "text"; text: string } {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    part.type === "text" &&
    "text" in part &&
    typeof part.text === "string"
  );
}

function threadMessageToUIMessage(message: ThreadMessage): UIMessage {
  const content = Array.isArray(message.content) ? message.content : [];

  return {
    id: message.id,
    role: message.role,
    parts: content.map((part) => {
      if (isTextMessagePart(part)) {
        return { type: "text", text: part.text };
      }

      return { type: "text", text: "" };
    }),
  };
}

async function loadThreadMessages(remoteId: string) {
  const data = await readApiData<AssistantThreadMessagesResponse>(
    await fetch(`/api/threads/${remoteId}/messages`, {
      method: "GET",
      cache: "no-store",
    }),
  );

  return data.messages;
}

async function appendThreadMessage(input: {
  remoteId: string;
  message: ThreadMessage;
  parentId: string | null;
}) {
  await readApiData<AssistantThreadMessageRecord>(
    await fetch(`/api/threads/${input.remoteId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: input.message,
        parentId: input.parentId,
      }),
    }),
  );
}

export function createAssistantThreadHistoryAdapter(
  aui: AssistantHistoryContext,
): ThreadHistoryAdapter {
  return {
    async load() {
      const { remoteId } = aui.threadListItem().getState();
      if (!remoteId) {
        return { messages: [] };
      }

      const messages = await loadThreadMessages(remoteId);
      return {
        messages: messages.map((entry) => ({
          message: entry.message,
          parentId: entry.parentId,
        })),
      };
    },
    async append({ message, parentId }: ExportedMessageRepositoryItem) {
      const { remoteId } = await aui.threadListItem().initialize();
      await appendThreadMessage({
        remoteId,
        message,
        parentId,
      });
    },
    withFormat<TMessage, TStorageFormat extends Record<string, unknown>>(
      formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
    ): GenericThreadHistoryAdapter<TMessage> {
      return {
        async load(): Promise<MessageFormatRepository<TMessage>> {
          const { remoteId } = aui.threadListItem().getState();
          if (!remoteId) {
            return { messages: [] };
          }

          const rows = await loadThreadMessages(remoteId);
          const messages: MessageFormatItem<TMessage>[] = rows.flatMap((entry) => {
            const stored = entry.message as unknown;
            const uiMessage = isUIMessage(stored)
              ? stored
              : threadMessageToUIMessage(entry.message);

            return [
              {
                parentId: entry.parentId,
                message: uiMessage as TMessage,
              },
            ];
          });

          const lastMessage = messages.at(-1);

          return {
            headId: lastMessage
              ? formatAdapter.getId(lastMessage.message)
              : null,
            messages,
          };
        },
        async append(item: MessageFormatItem<TMessage>) {
          const { remoteId } = await aui.threadListItem().initialize();
          const uiMessage = item.message as unknown as UIMessage;

          await appendThreadMessage({
            remoteId,
            message: uiMessage as unknown as ThreadMessage,
            parentId: item.parentId,
          });
        },
      };
    },
  };
}
