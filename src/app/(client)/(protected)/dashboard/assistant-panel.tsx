"use client";

import Image from "next/image";
import { createAssistantStream } from "assistant-stream";
import { cn } from "@/lib/utils";
import type {
  AssistantThreadListItem,
} from "@/features/assistant-threads";
import type { ApiResponse } from "@/server/types/api";
import {
  ActionBarPrimitive,
  ActionBarMorePrimitive,
  AssistantRuntimeProvider,
  AuiIf,
  AttachmentPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  RuntimeAdapterProvider,
  ThreadPrimitive,
  useRemoteThreadListRuntime,
  useAui,
  useAuiState,
  useThreadList,
  type RemoteThreadListAdapter,
  type ThreadMessage,
} from "@assistant-ui/react";
import { useChat } from "@ai-sdk/react";
import type { ChatTransport, UIMessage } from "ai";
import {
  AssistantChatTransport,
  useAISDKRuntime,
} from "@assistant-ui/react-ai-sdk";
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  Cross2Icon,
  Pencil1Icon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { TooltipIconButton } from "@/components/tooltip-icon-button";
import { useShallow } from "zustand/shallow";
import {
  AudioLines,
  Download,
  Mic,
  MoreHorizontal,
  PlusIcon,
  Share,
  ThumbsDown,
  ThumbsUp,
  Volume2,
} from "lucide-react";
import { MarkdownText } from "@/components/markdown-text";
import { ToolFallback } from "@/components/tool-fallback";
import { ChatExecutionLogPanel } from "@/app/(client)/(protected)/dashboard/chat-execution-log";
import { createAssistantThreadHistoryAdapter } from "@/app/(client)/(protected)/dashboard/assistant-thread-history-adapter";

type AssistantThreadListResponse = {
  threads: AssistantThreadListItem[];
};

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

async function readApiData<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.ok) {
    throw new Error(
      payload.ok ? `Request failed: ${response.status}` : payload.error.message,
    );
  }

  return payload.data;
}

function toRemoteThread(thread: AssistantThreadListItem) {
  return {
    status: thread.archived ? "archived" : "regular",
    remoteId: thread.id,
    title: thread.title,
  } as const;
}

function extractThreadTitleCandidate(messages: readonly ThreadMessage[]): string {
  const firstUserMessage = messages.find((message) => message.role === "user");
  if (!firstUserMessage || !Array.isArray(firstUserMessage.content)) {
    return "New command center thread";
  }

  const text = firstUserMessage.content
    .flatMap((part) => {
      if (!isTextMessagePart(part)) {
        return [];
      }

      return [part.text.trim()];
    })
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return "New command center thread";
  }

  return text.length <= 72 ? text : `${text.slice(0, 69).trimEnd()}...`;
}

const AssistantHistoryProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const aui = useAui();
  const auiRef = useRef(aui);
  auiRef.current = aui;
  const history = useMemo(
    () =>
      createAssistantThreadHistoryAdapter({
        threadListItem: () => auiRef.current.threadListItem(),
      }),
    [],
  );

  return (
    <RuntimeAdapterProvider adapters={{ history }}>
      {children}
    </RuntimeAdapterProvider>
  );
};

const assistantThreadListAdapter: RemoteThreadListAdapter = {
  async list() {
    const data = await readApiData<AssistantThreadListResponse>(
      await fetch("/api/threads", {
        method: "GET",
        cache: "no-store",
      }),
    );

    return {
      threads: data.threads.map(toRemoteThread),
    };
  },
  async initialize(localId) {
    const thread = await readApiData<AssistantThreadListItem>(
      await fetch("/api/threads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          localId,
        }),
      }),
    );

    return {
      externalId: localId,
      remoteId: thread.id,
    };
  },
  async rename(remoteId, title) {
    await readApiData<AssistantThreadListItem>(
      await fetch(`/api/threads/${remoteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
        }),
      }),
    );
  },
  async archive(remoteId) {
    await readApiData<AssistantThreadListItem>(
      await fetch(`/api/threads/${remoteId}/archive`, {
        method: "POST",
      }),
    );
  },
  async unarchive(remoteId) {
    await readApiData<AssistantThreadListItem>(
      await fetch(`/api/threads/${remoteId}/unarchive`, {
        method: "POST",
      }),
    );
  },
  async delete(remoteId) {
    await readApiData<{ deleted: true }>(
      await fetch(`/api/threads/${remoteId}`, {
        method: "DELETE",
      }),
    );
  },
  async fetch(remoteId) {
    const thread = await readApiData<AssistantThreadListItem>(
      await fetch(`/api/threads/${remoteId}`, {
        method: "GET",
        cache: "no-store",
      }),
    );

    return toRemoteThread(thread);
  },
  async generateTitle(remoteId, messages) {
    const title = extractThreadTitleCandidate(messages);

    return createAssistantStream(async (controller) => {
      await readApiData<AssistantThreadListItem>(
        await fetch(`/api/threads/${remoteId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
          }),
        }),
      );

      controller.appendText(title);
    });
  },
  unstable_Provider: AssistantHistoryProvider,
};

const EmptyPanel: FC<{ copy: string }> = ({ copy }) => {
  return (
    <div className="text-muted-foreground rounded-2xl border border-dashed border-border px-4 py-6 text-sm">
      {copy}
    </div>
  );
};

const AssistantThreadSidebar: FC = () => {
  const aui = useAui();
  const threadList = useThreadList(
    useShallow((state) => ({
      threadIds: state.threadIds,
      archivedThreadIds: state.archivedThreadIds,
      threadItems: state.threadItems,
      mainThreadId: state.mainThreadId,
    })),
  );
  const [workingThreadId, setWorkingThreadId] = useState<string | null>(null);

  const regularThreads = useMemo(
    () =>
      threadList.threadIds.map((threadId: string) => ({
        threadId,
        remoteId: threadList.threadItems[threadId]?.remoteId,
        title: threadList.threadItems[threadId]?.title,
      })),
    [threadList.threadIds, threadList.threadItems],
  );
  const archivedThreads = useMemo(
    () =>
      threadList.archivedThreadIds.map((threadId: string) => ({
        threadId,
        remoteId: threadList.threadItems[threadId]?.remoteId,
        title: threadList.threadItems[threadId]?.title,
      })),
    [threadList.archivedThreadIds, threadList.threadItems],
  );

  const runThreadAction = useCallback(
    async (threadId: string, action: () => Promise<void>) => {
      setWorkingThreadId(threadId);
      try {
        await action();
        await aui.threads().reload();
      } finally {
        setWorkingThreadId(null);
      }
    },
    [aui],
  );

  const handleRename = useCallback(
    async (threadId: string, remoteId: string | undefined, currentTitle?: string) => {
      if (!remoteId) {
        return;
      }

      const nextTitle = window.prompt("Rename thread", currentTitle ?? "");
      if (!nextTitle?.trim()) {
        return;
      }

      await runThreadAction(threadId, async () => {
        await readApiData<AssistantThreadListItem>(
          await fetch(`/api/threads/${remoteId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: nextTitle,
            }),
          }),
        );
      });
    },
    [runThreadAction],
  );

  const handleArchive = useCallback(
    async (threadId: string, remoteId: string | undefined) => {
      if (!remoteId) {
        return;
      }

      await runThreadAction(threadId, async () => {
        if (threadList.mainThreadId === threadId) {
          void aui.threads().switchToNewThread();
        }

        await readApiData<AssistantThreadListItem>(
          await fetch(`/api/threads/${remoteId}/archive`, {
            method: "POST",
          }),
        );
      });
    },
    [aui, runThreadAction, threadList.mainThreadId],
  );

  const handleUnarchive = useCallback(
    async (threadId: string, remoteId: string | undefined) => {
      if (!remoteId) {
        return;
      }

      await runThreadAction(threadId, async () => {
        await readApiData<AssistantThreadListItem>(
          await fetch(`/api/threads/${remoteId}/unarchive`, {
            method: "POST",
          }),
        );
      });
    },
    [runThreadAction],
  );

  const handleDelete = useCallback(
    async (threadId: string, remoteId: string | undefined) => {
      if (!remoteId) {
        return;
      }

      const confirmed = window.confirm(
        "Delete this assistant thread and its persisted messages?",
      );
      if (!confirmed) {
        return;
      }

      await runThreadAction(threadId, async () => {
        if (threadList.mainThreadId === threadId) {
          void aui.threads().switchToNewThread();
        }

        await readApiData<{ deleted: true }>(
          await fetch(`/api/threads/${remoteId}`, {
            method: "DELETE",
          }),
        );
      });
    },
    [aui, runThreadAction, threadList.mainThreadId],
  );

  return (
    <div className="bg-panel-muted/40 flex min-h-0 flex-col">
      <div className="border-border border-b px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
              Remote threads
            </p>
            <p className="mt-1 text-sm font-medium">Backend-owned conversations</p>
          </div>
          <button
            type="button"
            onClick={() => void aui.threads().switchToNewThread()}
            className="bg-panel text-foreground inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium"
          >
            <PlusIcon className="size-4" />
            New
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-2">
          {regularThreads.length > 0 ? (
            regularThreads.map((item) => {
              const isActive = threadList.mainThreadId === item.threadId;
              const isWorking = workingThreadId === item.threadId;

              return (
                <div
                  key={item.threadId}
                  className={cn(
                    "rounded-2xl border px-3 py-3",
                    isActive
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-panel",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void aui.threads().switchToThread(item.threadId)}
                    className="w-full text-left"
                  >
                    <p className="truncate text-sm font-medium">
                      {item.title ?? "Untitled thread"}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {item.remoteId ? "Persisted in backend" : "Draft thread"}
                    </p>
                  </button>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void handleRename(item.threadId, item.remoteId, item.title)
                      }
                      disabled={isWorking || !item.remoteId}
                      className="bg-panel-muted rounded-full px-2.5 py-1 text-[11px] font-medium disabled:opacity-50"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleArchive(item.threadId, item.remoteId)}
                      disabled={isWorking || !item.remoteId}
                      className="bg-panel-muted rounded-full px-2.5 py-1 text-[11px] font-medium disabled:opacity-50"
                    >
                      Archive
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.threadId, item.remoteId)}
                      disabled={isWorking || !item.remoteId}
                      className="rounded-full bg-red-500/8 px-2.5 py-1 text-[11px] font-medium text-red-600 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyPanel copy="New assistant threads will persist here instead of living only in browser state." />
          )}
        </div>

        {archivedThreads.length > 0 ? (
          <div className="mt-6">
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
              Archived
            </p>
            <div className="mt-3 space-y-2">
              {archivedThreads.map((item) => {
                const isWorking = workingThreadId === item.threadId;

                return (
                  <div
                    key={item.threadId}
                    className="border-border bg-panel rounded-2xl border px-3 py-3"
                  >
                    <p className="truncate text-sm font-medium">
                      {item.title ?? "Untitled thread"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleUnarchive(item.threadId, item.remoteId)}
                        disabled={isWorking || !item.remoteId}
                        className="bg-panel-muted rounded-full px-2.5 py-1 text-[11px] font-medium disabled:opacity-50"
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item.threadId, item.remoteId)}
                        disabled={isWorking || !item.remoteId}
                        className="rounded-full bg-red-500/8 px-2.5 py-1 text-[11px] font-medium text-red-600 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const ChatGPT: FC = () => {
  return (
    <ThreadPrimitive.Root className="text-foreground flex h-full min-h-0 flex-col items-stretch bg-transparent px-4">
      <AuiIf condition={(s) => s.thread.isEmpty}>
        <EmptyState />
      </AuiIf>

      <AuiIf condition={(s) => !s.thread.isEmpty}>
        <ThreadPrimitive.Viewport className="flex min-h-0 grow flex-col gap-8 overflow-y-auto pt-6">
          <ThreadPrimitive.Messages>
            {({ message }) => {
              if (message.composer.isEditing) return <EditComposer />;
              if (message.role === "user") return <UserMessage />;
              return <AssistantMessage />;
            }}
          </ThreadPrimitive.Messages>

          <ThreadPrimitive.ViewportFooter className="bg-footer-surface sticky bottom-0 mx-auto mt-auto flex w-full max-w-3xl flex-col gap-2 overflow-visible rounded-t-3xl pb-4">
            <ThreadScrollToBottom />
            <ChatExecutionLogPanel />
            <Composer placeholder="Ask anything" />
            <p className="text-subtle-foreground text-center text-xs">
              SpierWeb can make mistakes. Check important info.
            </p>
          </ThreadPrimitive.ViewportFooter>
        </ThreadPrimitive.Viewport>
      </AuiIf>
    </ThreadPrimitive.Root>
  );
};

const EmptyState: FC = () => {
  return (
    <div className="flex grow flex-col items-center justify-center px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-stretch gap-6">
        <h1 className="text-foreground text-center text-2xl font-medium sm:text-3xl">
          Where should we begin?
        </h1>
        <p className="text-muted-foreground text-center text-sm">
          Ask your assistant to manage inbox, calendar, and follow-ups from one
          place.
        </p>
        <ChatExecutionLogPanel />
        <Composer placeholder="Ask anything" />
      </div>
    </div>
  );
};

const Composer: FC<{ placeholder: string }> = ({ placeholder }) => {
  return (
    <ComposerPrimitive.Root className="bg-composer border-composer-border focus-within:border-composer-border-focus group/composer flex w-full flex-col rounded-[28px] border px-2 py-2 shadow-[var(--shadow-composer)]">
      <AuiIf condition={(s) => s.composer.attachments.length > 0}>
        <div className="flex flex-row flex-wrap gap-2 px-1 pt-1 pb-2">
          <ComposerPrimitive.Attachments
            components={{ Attachment: ChatGPTAttachmentUI }}
          />
        </div>
      </AuiIf>

      <div className="flex items-end gap-1">
        <ComposerPrimitive.AddAttachment asChild>
          <button
            type="button"
            className="text-icon-muted hover:bg-accent hover:text-icon-strong flex size-9 shrink-0 items-center justify-center rounded-full transition-colors"
            aria-label="Add attachment"
          >
            <PlusIcon size={20} />
          </button>
        </ComposerPrimitive.AddAttachment>

        <ComposerPrimitive.Input
          placeholder={placeholder}
          rows={1}
          className="text-foreground placeholder:text-subtle-foreground max-h-52 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-base outline-none"
        />

        <div className="flex shrink-0 items-center gap-1">
          <ComposerPrimaryAction />
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
};

const ComposerPrimaryAction: FC = () => {
  return (
    <div className="flex items-center gap-1">
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full">
          <div className="size-2.5 rounded-[2px] bg-current" />
        </ComposerPrimitive.Cancel>
      </AuiIf>

      <AuiIf
        condition={(s) => !s.thread.isRunning && s.composer.dictation != null}
      >
        <ComposerPrimitive.StopDictation
          className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full"
          aria-label="Stop dictation"
        >
          <div className="size-2.5 animate-pulse rounded-[2px] bg-current" />
        </ComposerPrimitive.StopDictation>
      </AuiIf>

      <AuiIf
        condition={(s) =>
          !s.thread.isRunning &&
          s.composer.dictation == null &&
          !s.composer.isEmpty
        }
      >
        <ComposerPrimitive.Send className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full transition-opacity disabled:opacity-30">
          <ArrowUpIcon className="size-6" />
        </ComposerPrimitive.Send>
      </AuiIf>

      <AuiIf
        condition={(s) =>
          !s.thread.isRunning &&
          s.composer.dictation == null &&
          s.composer.isEmpty
        }
      >
        <ComposerPrimitive.Dictate
          className="text-icon-muted hover:bg-accent hover:text-icon-strong flex size-9 items-center justify-center rounded-full transition-colors"
          aria-label="Dictate"
        >
          <Mic className="size-5" />
        </ComposerPrimitive.Dictate>

        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full"
        >
          <AudioLines className="size-5" />
        </button>
      </AuiIf>
    </div>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        className="bg-background border-border absolute -top-10 z-10 self-center rounded-full border p-2 shadow-[var(--shadow-panel)] disabled:invisible"
      >
        <ChevronDownIcon className="size-5" />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative mx-auto flex w-full max-w-3xl flex-col items-end gap-1">
      <div className="flex flex-row flex-wrap justify-end gap-2">
        <MessagePrimitive.Attachments
          components={{ Attachment: ChatGPTAttachmentUI }}
        />
      </div>

      <div className="flex items-start gap-4">
        <ActionBarPrimitive.Root
          hideWhenRunning
          autohide="not-last"
          autohideFloat="single-branch"
          className="mt-2"
        >
          <ActionBarPrimitive.Edit asChild>
            <TooltipIconButton tooltip="Edit" className="text-subtle-foreground">
              <Pencil1Icon className="size-5" />
            </TooltipIconButton>
          </ActionBarPrimitive.Edit>
        </ActionBarPrimitive.Root>

        <div className="bg-secondary text-secondary-foreground rounded-3xl px-5 py-2">
          <MessagePrimitive.Parts />
        </div>
      </div>

      <BranchPicker className="mt-2 mr-3" />
    </MessagePrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <ComposerPrimitive.Root className="bg-secondary mx-auto flex w-full max-w-3xl flex-col justify-end gap-1 rounded-3xl">
      <ComposerPrimitive.Input className="text-foreground flex h-8 w-full resize-none bg-transparent p-5 pb-0 outline-none" />

      <div className="m-3 mt-2 flex items-center justify-center gap-2 self-end">
        <ComposerPrimitive.Cancel className="bg-background text-foreground hover:bg-muted rounded-full px-3 py-2 text-sm font-semibold">
          Cancel
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-3 py-2 text-sm font-semibold">
          Send
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
};

const assistantActionClassName =
  "text-icon-muted hover:bg-accent hover:text-icon-strong flex size-8 items-center justify-center rounded-md transition-colors";

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative mx-auto flex w-full max-w-3xl flex-col">
      <div className="text-foreground">
        <MessagePrimitive.Parts>
          {({ part }) => {
            if (part.type === "text") return <MarkdownText />;
            if (part.type === "tool-call")
              return part.toolUI ?? <ToolFallback {...part} />;
            return null;
          }}
        </MessagePrimitive.Parts>
      </div>

      <div className="-ml-2 flex items-center pt-1">
        <ActionBarPrimitive.Root
          hideWhenRunning
          className="flex items-center gap-0.5"
        >
          <ActionBarPrimitive.Copy className={assistantActionClassName}>
            <AuiIf condition={(s) => s.message.isCopied}>
              <CheckIcon className="size-5" />
            </AuiIf>
            <AuiIf condition={(s) => !s.message.isCopied}>
              <CopyIcon className="size-5" />
            </AuiIf>
          </ActionBarPrimitive.Copy>
          <ActionBarPrimitive.FeedbackPositive
            className={assistantActionClassName}
          >
            <ThumbsUp className="size-5" />
          </ActionBarPrimitive.FeedbackPositive>
          <ActionBarPrimitive.FeedbackNegative
            className={assistantActionClassName}
          >
            <ThumbsDown className="size-5" />
          </ActionBarPrimitive.FeedbackNegative>
          <ActionBarPrimitive.Speak className={assistantActionClassName}>
            <Volume2 className="size-5" />
          </ActionBarPrimitive.Speak>
          <button type="button" className={assistantActionClassName}>
            <Share className="size-5" />
          </button>
          <ActionBarPrimitive.Reload className={assistantActionClassName}>
            <ReloadIcon className="size-5" />
          </ActionBarPrimitive.Reload>
          <ActionBarMorePrimitive.Root>
            <ActionBarMorePrimitive.Trigger asChild>
              <button
                type="button"
                aria-label="More"
                className={cn(
                  assistantActionClassName,
                  "data-[state=open]:bg-accent",
                )}
              >
                <MoreHorizontal className="size-5" />
              </button>
            </ActionBarMorePrimitive.Trigger>
            <ActionBarMorePrimitive.Content
              side="bottom"
              align="end"
              sideOffset={6}
              className="bg-popover/95 text-popover-foreground data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out data-[side=bottom]:slide-in-from-top-2 z-50 min-w-40 overflow-hidden rounded-xl border p-1.5 shadow-lg backdrop-blur-sm"
            >
              <ActionBarPrimitive.ExportMarkdown asChild>
                <ActionBarMorePrimitive.Item className="text-muted-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none select-none">
                  <Download className="size-5" />
                  Export as Markdown
                </ActionBarMorePrimitive.Item>
              </ActionBarPrimitive.ExportMarkdown>
            </ActionBarMorePrimitive.Content>
          </ActionBarMorePrimitive.Root>
        </ActionBarPrimitive.Root>
        <BranchPicker className="ml-1" />
      </div>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<{ className?: string }> = ({ className }) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "text-muted-foreground inline-flex items-center text-sm font-semibold",
        className,
      )}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous" className="text-subtle-foreground">
          <ChevronLeftIcon className="size-5" />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <BranchPickerPrimitive.Number />/<BranchPickerPrimitive.Count />
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next" className="text-subtle-foreground">
          <ChevronRightIcon className="size-5" />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

const useFileSrc = (file: File | undefined) => {
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!file) {
      setSrc(undefined);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return src;
};

const useAttachmentSrc = () => {
  const { file, src } = useAuiState(
    useShallow((s): { file?: File; src?: string } => {
      if (s.attachment.type !== "image") return {};
      if (s.attachment.file) return { file: s.attachment.file };
      const imagePart = s.attachment.content?.find(
        (part) => part.type === "image",
      );
      if (imagePart?.type !== "image") return {};
      return { src: imagePart.image };
    }),
  );

  return useFileSrc(file) ?? src;
};

const ChatGPTAttachmentUI: FC = () => {
  const aui = useAui();
  const isComposer = aui.attachment.source !== "message";
  const src = useAttachmentSrc();

  return (
    <AttachmentPrimitive.Root className="group/attachment relative">
      <div className="bg-secondary flex items-center gap-2 overflow-hidden rounded-2xl border">
        <AuiIf condition={(s) => s.attachment.type === "image"}>
          {src ? (
            <Image
              className="size-32 rounded-md object-cover"
              alt="Attachment"
              src={src}
              width={128}
              height={128}
            />
          ) : (
            <div className="flex h-full w-12 items-center justify-center rounded-md">
              <AttachmentPrimitive.unstable_Thumb className="text-xs" />
            </div>
          )}
        </AuiIf>
        <AuiIf condition={(s) => s.attachment.type !== "image"}>
          <div className="bg-background text-muted-foreground flex h-full w-12 items-center justify-center rounded-[9px]">
            <AttachmentPrimitive.unstable_Thumb className="text-xs" />
          </div>
        </AuiIf>
      </div>
      {isComposer && (
        <AttachmentPrimitive.Remove className="border-border bg-panel text-muted-foreground hover:bg-accent hover:text-foreground absolute -top-1.5 -right-1.5 flex size-7 items-center justify-center rounded-full border transition-all">
          <Cross2Icon className="size-5" />
        </AttachmentPrimitive.Remove>
      )}
    </AttachmentPrimitive.Root>
  );
};

function useDynamicChatTransport(
  transport: AssistantChatTransport<UIMessage>,
): ChatTransport<UIMessage> {
  const transportRef = useRef(transport);
  useEffect(() => {
    transportRef.current = transport;
  });

  return useMemo(
    () =>
      new Proxy(transportRef.current, {
        get(_, prop) {
          const value =
            transportRef.current[prop as keyof AssistantChatTransport<UIMessage>];
          return typeof value === "function"
            ? value.bind(transportRef.current)
            : value;
        },
      }) as ChatTransport<UIMessage>,
    [],
  );
}

function useAssistantChatRuntime() {
  const transport = useDynamicChatTransport(
    useMemo(
      () =>
        new AssistantChatTransport({
          api: "/api/chat",
        }),
      [],
    ),
  );
  const threadId = useAuiState((state) => state.threadListItem.id);
  const aui = useAui();
  const chat = useChat({
    id: threadId,
    transport,
  });
  const runtime = useAISDKRuntime(chat);

  if (transport instanceof AssistantChatTransport) {
    transport.setRuntime(runtime);
    transport.__internal_setGetThreadListItem(() =>
      aui.threadListItem.source ? aui.threadListItem() : undefined,
    );
  }

  return runtime;
}

export default function DashboardAssistantPanel() {
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: useAssistantChatRuntime,
    adapter: assistantThreadListAdapter,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[260px_minmax(0,1fr)]">
        <AssistantThreadSidebar />
        <div className="border-border min-h-0 border-l">
          <ChatGPT />
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}
