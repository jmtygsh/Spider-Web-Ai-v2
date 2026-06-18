"use client";

import { cn } from "@/lib/utils";
import type { InboxTriageItem, InboxTriageView } from "@/features/inbox-triage";
import type { FC } from "react";

type InboxTriagePanelProps = {
  triage: InboxTriageView;
  pendingAiScan?: number;
  formatRelativeTime: (value: string | null) => string;
};

const BUCKET_CONFIG: Array<{
  key: keyof InboxTriageView;
  label: string;
  description: string;
  accent: string;
}> = [
  {
    key: "actionRequired",
    label: "Action",
    description: "Open asks waiting on you",
    accent: "border-red-400/40 bg-red-500/5",
  },
  {
    key: "schedule",
    label: "Schedule",
    description: "Meeting intent detected",
    accent: "border-amber-400/40 bg-amber-500/5",
  },
  {
    key: "fyi",
    label: "FYI",
    description: "Unread, no tracked asks",
    accent: "border-sky-400/40 bg-sky-500/5",
  },
  {
    key: "later",
    label: "Later",
    description: "Low urgency for now",
    accent: "border-border bg-panel-muted/60",
  },
];

function TriageCard({
  item,
  formatRelativeTime,
}: {
  item: InboxTriageItem;
  formatRelativeTime: (value: string | null) => string;
}) {
  return (
    <div className="border-border rounded-xl border px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">
          {item.thread.subject ?? item.thread.externalThreadId}
        </p>
        {item.source === "ai" ? (
          <span className="shrink-0 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-700">
            AI
          </span>
        ) : null}
      </div>
      <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
        {item.reason || item.thread.snippet}
      </p>
      <p className="text-muted-foreground mt-2 text-[11px]">
        {formatRelativeTime(item.thread.lastMessageAt)}
      </p>
    </div>
  );
}

export const InboxTriagePanel: FC<InboxTriagePanelProps> = ({
  triage,
  pendingAiScan = 0,
  formatRelativeTime,
}) => {
  const totalItems =
    triage.actionRequired.length +
    triage.schedule.length +
    triage.fyi.length +
    triage.later.length;

  if (totalItems === 0) {
    return (
      <div className="text-muted-foreground rounded-2xl border border-dashed border-border px-4 py-6 text-sm">
        Inbox triage buckets appear after Gmail sync and extraction runs.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pendingAiScan > 0 ? (
        <div className="rounded-2xl border border-violet-400/30 bg-violet-500/5 px-4 py-3 text-sm">
          {pendingAiScan} thread(s) waiting for AI triage scan.
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {BUCKET_CONFIG.map((bucket) => {
        const items = triage[bucket.key].slice(0, 4);

        return (
          <div
            key={bucket.key}
            className={cn("flex min-h-[180px] flex-col rounded-2xl border p-3", bucket.accent)}
          >
            <div className="mb-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{bucket.label}</p>
                <span className="text-muted-foreground text-[11px] font-medium">
                  {triage[bucket.key].length}
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">{bucket.description}</p>
            </div>
            <div className="space-y-2">
              {items.length > 0 ? (
                items.map((item) => (
                  <TriageCard
                    key={item.thread.id}
                    item={item}
                    formatRelativeTime={formatRelativeTime}
                  />
                ))
              ) : (
                <p className="text-muted-foreground text-xs">Nothing here yet.</p>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
};
