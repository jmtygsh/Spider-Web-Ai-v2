"use client";

import Link from "next/link";
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
  LogIn,
  LogOut,
  Mic,
  MoreHorizontal,
  PlusIcon,
  Share,
  ThumbsDown,
  ThumbsUp,
  UserPlus,
  Volume2,
  LogInIcon, LogOutIcon, MonitorIcon, MoonIcon, SunIcon
} from "lucide-react";
import { MarkdownText } from "@/components/markdown-text";
import { ToolFallback } from "@/components/tool-fallback";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { authClient } from "@/server/better-auth/client";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


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
  { title: "Reply to CEO", detail: "Inbox follow-up pending", priority: "Urgent" },
  { title: "Schedule Bob", detail: "Find a slot for next week", priority: "Today" },
  { title: "Follow-up VC", detail: "Send meeting recap", priority: "Pending" },
  { title: "3 urgent", detail: "New items waiting for action", priority: "Review" },
];

const calendarItems = [
  { time: "9:00 AM", title: "Leadership sync", meta: "30 min" },
  { time: "11:00 AM", title: "Investor call", meta: "45 min" },
  { time: "1:30 PM", title: "Product review", meta: "60 min" },
  { time: "4:00 PM", title: "Inbox catch-up", meta: "30 min" },
];

const ChatPage: FC = () => {
  const runtime = useLocalRuntime(assistantRuntimeAdapter);
  const { data: session, isPending } = useSession();
  const canUseApp = !!session?.user;
  const { setTheme } = useTheme();
  const authLabel = isPending ? "Checking session..." : canUseApp ? session.user.name ?? session.user.email : "Preview mode";

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="min-h-screen bg-[#eef1f4] text-[#0d0d0d] dark:bg-[#0b0c0f] dark:text-[#ececec]">
        <div className="flex container mx-auto items-center justify-between border-b border-black/5 px-4 py-4 dark:border-white/10">
          <div>


          </div>


          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-white px-3 py-1 text-xs font-medium text-[#4b5563] shadow-sm dark:bg-white/10 dark:text-[#d1d5db] sm:inline-flex">
              {authLabel}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <SunIcon className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                  <MoonIcon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="mt-3 rounded-none shadow-sm">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <SunIcon />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <MoonIcon />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <MonitorIcon />
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {canUseApp ? (
              <Button
                variant="outline"
                className="h-9 rounded-full px-4"
                onClick={async () => {
                  await authClient.signOut();
                }}
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            ) : (
              <>
                <Button asChild className="h-9 rounded-full px-4 border border-white/30">
                  <Link href="/login">
                    <LogIn className="size-4" />
                    Sign in
                  </Link>
                </Button>

              </>
            )}
          </div>
        </div>

        <div
          className={cn(
            "mx-auto flex min-h-[calc(100vh-73px)] px-4",
            canUseApp
              ? "container mx-auto flex-col lg:grid lg:grid-cols-[280px_minmax(0,1fr)_320px]"
              : "container mx-auto flex-col py-8",
          )}
        >

          {/* left side  */}
          {canUseApp && (
            <aside className="flex flex-col border-l border-b border-black/5 bg-white p-5 dark:border-white/10 dark:bg-[#0b0c0f]">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6b7280] dark:text-[#9ca3af]">
                Executive Copilot
              </p>
              <h1 className="mt-3 text-lg font-semibold">Action Queue</h1>
              <p className="mt-2 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                Tasks that need attention from your assistant.
              </p>
              <div className="mt-6">
                {actionQueueItems.map((item) => (
                  <div key={item.title} className="py-3 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="mt-1 text-xs text-[#6b7280] dark:text-[#9ca3af]">
                          {item.detail}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[11px] font-medium text-[#4b5563] dark:bg-white/10 dark:text-[#d1d5db]">
                        {item.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          )}

          <main
            className={cn(
              "flex min-h-[70vh] min-w-0 flex-col overflow-hidden",
              canUseApp
                ? "border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0c0f]"
                : "container mx-auto w-full max-w-4xl justify-center bg-transparent",
            )}
          >
            <div className={cn("min-h-0 flex-1", !canUseApp && "flex items-center")}>
              <ChatGPT canUseApp={canUseApp} />
            </div>
          </main>

          {canUseApp && (
            <aside className="flex flex-col border-r border-b border-black/5 bg-white p-5 dark:border-white/10 dark:bg-[#0b0c0f]">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6b7280] dark:text-[#9ca3af]">
                Calendar
              </p>
              <h2 className="t-3 text-lg font-semibold mt-2">Today</h2>
              <p className="mt-2 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                Upcoming events and scheduling context.
              </p>
              <div className="mt-6">
                {calendarItems.map((item) => (
                  <div
                    key={`${item.time}-${item.title}`}
                    className="px-4 py-3 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="min-w-20 text-sm font-semibold text-[#111827] dark:text-[#f3f4f6]">
                        {item.time}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="mt-1 text-xs text-[#6b7280] dark:text-[#9ca3af]">
                          {item.meta}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          )}
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
};

export default ChatPage;

const ChatGPT: FC<{ canUseApp: boolean }> = ({ canUseApp }) => {
  return (
    <ThreadPrimitive.Root
      className={cn(
        "flex h-full min-h-0 flex-col items-stretch bg-transparent px-4 text-[#0d0d0d] dark:text-[#ececec]",
        !canUseApp && "mx-auto w-full max-w-2xl px-6",
      )}
    >
      <AuiIf condition={(s) => s.thread.isEmpty}>
        <EmptyState canUseApp={canUseApp} />
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

          <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mx-auto mt-auto flex w-full max-w-3xl flex-col gap-2 overflow-visible rounded-t-3xl bg-white pb-4 dark:bg-[#111214]">
            <ThreadScrollToBottom />
            <Composer
              placeholder={canUseApp ? "Ask anything" : "Sign in to start chatting"}
              canUseApp={canUseApp}
            />
            <p className="text-center text-xs text-[#5d5d5d] dark:text-[#a8a8a8]">
              {canUseApp
                ? "SpierWeb can make mistakes. Check important info."
                : "You can explore the workspace now. Sign in to send prompts and run actions."}
            </p>
          </ThreadPrimitive.ViewportFooter>
        </ThreadPrimitive.Viewport>
      </AuiIf>
    </ThreadPrimitive.Root>
  );
};

const EmptyState: FC<{ canUseApp: boolean }> = ({ canUseApp }) => {
  return (
    <div
      className={cn(
        "flex grow flex-col items-center justify-center px-4 py-12",
        !canUseApp && "py-0",
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-col items-stretch gap-6",
          canUseApp ? "max-w-3xl" : "max-w-2xl",
        )}
      >
        <h1 className="text-center text-2xl font-medium text-[#0d0d0d] sm:text-3xl dark:text-[#ececec]">
          Where should we begin?
        </h1>
        <p className="text-center text-sm text-[#6b7280] dark:text-[#9ca3af]">
          Ask your assistant to manage inbox, calendar, and follow-ups from one place.
        </p>
        <Composer
          placeholder={canUseApp ? "Ask anything" : "Sign in to start chatting"}
          canUseApp={canUseApp}
        />

      </div>
    </div>
  );
};

const Composer: FC<{ placeholder: string; canUseApp: boolean }> = ({
  placeholder,
  canUseApp,
}) => {
  return (
    <ComposerPrimitive.Root
      className={cn(
        "group/composer flex w-full flex-col rounded-[28px] border border-[#e5e5e5] bg-white px-2 py-2 shadow-[0_2px_6px_-2px_rgba(0,0,0,0.05)] focus-within:border-[#d0d0d0] dark:border-transparent dark:bg-[#212121] dark:shadow-none dark:focus-within:border-transparent",
        !canUseApp && "opacity-80",
      )}
    >
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
            disabled={!canUseApp}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#5d5d5d] transition-colors hover:bg-[#0d0d0d]/5 hover:text-[#0d0d0d] dark:text-[#cdcdcd] dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Add attachment"
          >
            <PlusIcon size={20} />
          </button>
        </ComposerPrimitive.AddAttachment>

        <ComposerPrimitive.Input
          placeholder={placeholder}
          rows={1}
          disabled={!canUseApp}
          className="max-h-52 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-base text-[#0d0d0d] outline-none placeholder:text-[#8e8e8e] dark:text-[#ececec] dark:placeholder:text-[#8e8e8e]"
        />

        <div className="flex shrink-0 items-center gap-1">
          <ComposerPrimaryAction canUseApp={canUseApp} />
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
};

const ComposerPrimaryAction: FC<{ canUseApp: boolean }> = ({ canUseApp }) => {
  if (!canUseApp) {
    return (
      <Button asChild className="h-9 rounded-full px-4">
        <Link href="/login">
          <LogIn className="size-4" />
          Sign in
        </Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel className="flex size-9 items-center justify-center rounded-full bg-[#0d0d0d] text-white dark:bg-white dark:text-black">
          <div className="size-2.5 rounded-[2px] bg-current" />
        </ComposerPrimitive.Cancel>
      </AuiIf>

      <AuiIf
        condition={(s) => !s.thread.isRunning && s.composer.dictation != null}
      >
        <ComposerPrimitive.StopDictation
          className="flex size-9 items-center justify-center rounded-full bg-[#0d0d0d] text-white dark:bg-white dark:text-black"
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
        <ComposerPrimitive.Send className="flex size-9 items-center justify-center rounded-full bg-[#0d0d0d] text-white transition-opacity disabled:opacity-30 dark:bg-white dark:text-black">
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
          className="flex size-9 items-center justify-center rounded-full text-[#5d5d5d] transition-colors hover:bg-[#0d0d0d]/5 hover:text-[#0d0d0d] dark:text-[#cdcdcd] dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Dictate"
        >
          <Mic className="size-5" />
        </ComposerPrimitive.Dictate>

        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          className="flex size-9 items-center justify-center rounded-full bg-[#0d0d0d] text-white dark:bg-white dark:text-black"
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
        className="bg-background absolute -top-10 z-10 self-center rounded-full border p-2 shadow-sm disabled:invisible dark:border-white/15 dark:bg-[#2a2a2a]"
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
            <TooltipIconButton tooltip="Edit" className="text-[#b4b4b4]">
              <Pencil1Icon className="size-5" />
            </TooltipIconButton>
          </ActionBarPrimitive.Edit>
        </ActionBarPrimitive.Root>

        <div className="bg-secondary text-foreground rounded-3xl px-5 py-2 dark:bg-white/5 dark:text-[#eee]">
          <MessagePrimitive.Parts />
        </div>
      </div>

      <BranchPicker className="mt-2 mr-3" />
    </MessagePrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <ComposerPrimitive.Root className="bg-secondary mx-auto flex w-full max-w-3xl flex-col justify-end gap-1 rounded-3xl dark:bg-white/15">
      <ComposerPrimitive.Input className="text-foreground flex h-8 w-full resize-none bg-transparent p-5 pb-0 outline-none dark:text-white" />

      <div className="m-3 mt-2 flex items-center justify-center gap-2 self-end">
        <ComposerPrimitive.Cancel className="bg-background text-foreground hover:bg-muted rounded-full px-3 py-2 text-sm font-semibold dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800">
          Cancel
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-3 py-2 text-sm font-semibold dark:bg-white dark:text-black dark:hover:bg-white/90">
          Send
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
};

const assistantActionClassName =
  "flex size-8 items-center justify-center rounded-md text-[#5d5d5d] transition-colors hover:bg-[#0d0d0d]/5 hover:text-[#0d0d0d] dark:text-[#afafaf] dark:hover:bg-white/10 dark:hover:text-white";

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative mx-auto flex w-full max-w-3xl flex-col">
      <div className="text-[#0d0d0d] dark:text-[#ececec]">
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
                  "data-[state=open]:bg-[#0d0d0d]/5 dark:data-[state=open]:bg-white/10",
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
        "text-muted-foreground inline-flex items-center text-sm font-semibold dark:text-[#b4b4b4]",
        className,
      )}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous" className="text-[#b4b4b4]">
          <ChevronLeftIcon className="size-5" />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <BranchPickerPrimitive.Number />/<BranchPickerPrimitive.Count />
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next" className="text-[#b4b4b4]">
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
      <div className="bg-secondary flex items-center gap-2 overflow-hidden rounded-2xl border dark:bg-white/5">
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
          <div className="bg-background flex h-full w-12 items-center justify-center rounded-[9px] text-[#6b6b6b] dark:bg-[#3a3a3a] dark:text-[#9a9a9a]">
            <AttachmentPrimitive.unstable_Thumb className="text-xs" />
          </div>
        </AuiIf>
      </div>
      {isComposer && (
        <AttachmentPrimitive.Remove className="absolute -top-1.5 -right-1.5 flex size-7 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#6b6b6b] transition-all hover:bg-[#f5f5f5] hover:text-[#0d0d0d] dark:border-[#3a3a3a] dark:bg-[#1a1a1a] dark:text-[#9a9a9a] dark:hover:bg-[#252525] dark:hover:text-white">
          <Cross2Icon className="size-5" />
        </AttachmentPrimitive.Remove>
      )}
    </AttachmentPrimitive.Root>
  );
};
