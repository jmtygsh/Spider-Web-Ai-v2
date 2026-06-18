"use client";

import { cn } from "@/lib/utils";
import {
  ActionBarPrimitive,
  ActionBarMorePrimitive,
  AssistantRuntimeProvider,
  AuiIf,
  AttachmentPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useLocalRuntime,
  useAui,
  useAuiState,
  type ChatModelAdapter,
} from "@assistant-ui/react";
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
import { useEffect, useState, type FC } from "react";
import { TooltipIconButton } from "@/components/tooltip-icon-button";
import { useShallow } from "zustand/shallow";
import {
  AudioLines,
  Download,
  LogOut,
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

const assistantRuntimeAdapter: ChatModelAdapter = {
  async run({ messages, abortSignal }) {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.status}`);
    }

    const data = (await response.json()) as { message?: string };

    return {
      content: [{ type: "text", text: data.message ?? "" }],
    };
  },
};

const actionQueueItems = [
  {
    title: "Reply to CEO",
    detail: "Inbox follow-up pending",
    priority: "Urgent",
  },
  {
    title: "Schedule Bob",
    detail: "Find a slot for next week",
    priority: "Today",
  },
  { title: "Follow-up VC", detail: "Send meeting recap", priority: "Pending" },
  {
    title: "3 urgent",
    detail: "New items waiting for action",
    priority: "Review",
  },
];

const calendarItems = [
  { time: "9:00 AM", title: "Leadership sync", meta: "30 min" },
  { time: "11:00 AM", title: "Investor call", meta: "45 min" },
  { time: "1:30 PM", title: "Product review", meta: "60 min" },
  { time: "4:00 PM", title: "Inbox catch-up", meta: "30 min" },
];

const ChatPage: FC = () => {
  const runtime = useLocalRuntime(assistantRuntimeAdapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="min-h-screen bg-app-shell text-foreground">
        <div className="container mx-auto flex min-h-[calc(100vh-73px)] flex-col px-4 lg:grid lg:grid-cols-[280px_minmax(0,1fr)_320px]">
          {/* left side  */}
          <aside className="flex flex-col border-b border-l border-border bg-panel p-5">
            <p className="text-muted-foreground text-sm font-semibold tracking-[0.24em] uppercase">
              Executive Copilot
            </p>
            <h1 className="mt-3 text-lg font-semibold">Action Queue</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Tasks that need attention from your assistant.
            </p>
            <div className="mt-6">
              {actionQueueItems.map((item) => (
                <div key={item.title} className="py-3 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {item.detail}
                      </p>
                    </div>
                    <span className="bg-panel-muted text-muted-foreground rounded-full px-2.5 py-1 text-[11px] font-medium">
                      {item.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <main className="flex min-h-[70vh] min-w-0 flex-col overflow-hidden border border-border bg-panel shadow-[var(--shadow-panel)]">
            <div className="min-h-0 flex-1">
              <ChatGPT />
            </div>
          </main>

          <aside className="flex flex-col border-r border-b border-border bg-panel p-5">
            <p className="text-muted-foreground text-sm font-semibold tracking-[0.24em] uppercase">
              Calendar
            </p>
            <h2 className="mt-2 text-lg font-semibold">Today</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Upcoming events and scheduling context.
            </p>
            <div className="mt-6">
              {calendarItems.map((item) => (
                <div
                  key={`${item.time}-${item.title}`}
                  className="px-4 py-3 transition-colors hover:bg-[var(--panel-hover)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-foreground min-w-20 text-sm font-semibold">
                      {item.time}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {item.meta}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
};

export default ChatPage;

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
      const src = s.attachment.content?.filter((c) => c.type === "image")[0]
        ?.image;
      if (!src) return {};
      return { src };
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
            <img
              className="size-32 rounded-md object-cover"
              alt="Attachment"
              src={src}
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
