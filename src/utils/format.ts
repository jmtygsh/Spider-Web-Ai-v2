import type { CalendarEventItem, MailListItem } from "@/types/corsair";

// Purpose:
// Today's date as YYYY-MM-DD in UTC (for filtering today's events).
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// Purpose:
// Extract the calendar date portion from an event's start time.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function eventDateStr(item: CalendarEventItem): string {
  const raw = item.start?.dateTime ?? item.start?.date ?? "";
  return raw.slice(0, 10);
}

// Purpose:
// Format event start as a short time label, or "All day" for date-only events.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function formatEventTime(item: CalendarEventItem): string {
  const dt = item.start?.dateTime;
  if (!dt) return "All day";
  return new Date(dt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Purpose:
// Human-readable duration between event start and end (e.g. "45 min", "1 hr 30 min").
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function formatDuration(item: CalendarEventItem): string {
  const s = item.start?.dateTime;
  const e = item.end?.dateTime;
  if (!s || !e) return "";
  const mins = Math.round(
    (new Date(e).getTime() - new Date(s).getTime()) / 60000,
  );
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

// Purpose:
// Compact timestamp for mail rows — time if today, otherwise short date.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function formatEmailTime(internalDate?: string): string {
  if (!internalDate) return "";
  const d = new Date(Number(internalDate));
  const isToday = d.toDateString() === new Date().toDateString();
  if (isToday)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// Purpose:
// Pull display name from a raw "Name <email>" From header string.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function formatFrom(from?: string): string {
  if (!from) return "Unknown";
  const match = /^(.+?)\s*</.exec(from);
  return match?.[1]?.trim() ?? from;
}

// Purpose:
// Short time label for chat message bubbles (e.g. "2:30 PM").
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function formatChatMessageTime(value?: string): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Purpose:
// Full timestamp for chat message tooltips (date + time).
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function formatChatMessageTimestamp(value?: string): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Purpose:
// True when Gmail labelIds include the IMPORTANT label.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function isImportant(item: MailListItem): boolean {
  return item.labelIds?.includes("IMPORTANT") ?? false;
}

// Purpose:
// True when Gmail labelIds include the UNREAD label.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function isUnread(item: MailListItem): boolean {
  return item.labelIds?.includes("UNREAD") ?? false;
}
