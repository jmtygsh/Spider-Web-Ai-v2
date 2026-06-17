import type { MailDetailItem, MailListItem } from "@/types/corsair";
import type { MailAddress, MailFolder, MailMessage, MailThread } from "@/types/mail-ui";
import { mailBodyToParagraphs, normalizeMailBodyText } from "@/utils/mail-body";

// Purpose:
// Parse "Name <email@example.com>" or bare email into structured address.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
function parseMailAddress(raw?: string): MailAddress {
  if (!raw?.trim()) {
    return { name: "Unknown", email: "" };
  }

  const match = /^(.+?)\s*<([^>]+)>$/.exec(raw.trim());
  if (match) {
    return { name: match[1]!.replace(/^"|"$/g, "").trim(), email: match[2]!.trim() };
  }

  if (raw.includes("@")) {
    return { name: raw.split("@")[0] ?? raw, email: raw.trim() };
  }

  return { name: raw.trim(), email: "" };
}

// Purpose:
// Split a comma-separated To/Cc header into parsed addresses.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
function parseMailAddresses(raw?: string): MailAddress[] {
  if (!raw?.trim()) return [];

  return raw
    .split(",")
    .map((part) => parseMailAddress(part.trim()))
    .filter((address) => address.email || address.name);
}

// Purpose:
// Map Gmail labelIds to the app's virtual folder (inbox, sent, trash, etc.).
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function labelIdsToFolder(labelIds: string[] = []): MailFolder {
  if (labelIds.includes("TRASH")) return "trash";
  if (labelIds.includes("SPAM")) return "spam";
  if (labelIds.includes("DRAFT")) return "drafts";
  if (labelIds.includes("SENT") && !labelIds.includes("INBOX")) return "sent";
  if (labelIds.includes("INBOX")) return "inbox";
  return "archive";
}

function bodyToParagraphs(body?: string, fallback?: string): string[] {
  const text = normalizeMailBodyText(body) || fallback?.trim() || "";
  return mailBodyToParagraphs(text);
}

// Purpose:
// Map a cached list item to a MailMessage (snippet-only body).
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
function listItemToMessage(item: MailListItem): MailMessage {
  return {
    id: item.id,
    threadId: item.threadId ?? item.id,
    labelIds: item.labelIds ?? [],
    snippet: item.snippet ?? "",
    historyId: "",
    internalDate: item.internalDate ?? "",
    subject: item.subject ?? "(No subject)",
    from: parseMailAddress(item.from),
    to: parseMailAddresses(item.to),
    body: bodyToParagraphs(undefined, item.snippet),
    headers: [],
    isUnread: item.labelIds?.includes("UNREAD"),
  };
}

// Purpose:
// Map a cached detail item to a MailMessage with full body and attachments.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
function detailItemToMessage(item: MailDetailItem): MailMessage {
  const plainBody = item.body ?? normalizeMailBodyText(item.bodyHtml) ?? item.snippet ?? "";

  return {
    id: item.id,
    threadId: item.threadId ?? item.id,
    labelIds: item.labelIds ?? [],
    snippet: item.snippet ?? "",
    historyId: item.historyId ?? "",
    internalDate: item.internalDate ?? "",
    subject: item.subject ?? "(No subject)",
    from: parseMailAddress(item.from),
    to: parseMailAddresses(item.to),
    body: mailBodyToParagraphs(plainBody),
    bodyHtml: item.bodyHtml,
    headers: item.headers ?? [],
    attachments: item.attachments?.map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      sizeLabel: attachment.sizeLabel,
    })),
    isUnread: item.labelIds?.includes("UNREAD"),
  };
}
// Purpose:
// Assemble a MailThread from mapped messages — picks latest snippet and participants.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
function buildThreadFromMessages(
  threadId: string,
  messages: MailMessage[],
): MailThread | undefined {
  if (messages.length === 0) return undefined;

  const latest = [...messages].sort(
    (a, b) => Number(b.internalDate ?? 0) - Number(a.internalDate ?? 0),
  )[0]!;

  const participants = new Map<string, MailAddress>();
  for (const message of messages) {
    const key = message.from.email || message.from.name;
    if (key) participants.set(key, message.from);
  }

  return {
    id: threadId,
    folder: labelIdsToFolder(latest.labelIds),
    historyId: latest.historyId,
    snippet: latest.snippet,
    participants: [...participants.values()],
    messages,
    isUnread: messages.some((message) => message.isUnread),
    isStarred: messages.some((message) => message.labelIds.includes("STARRED")),
  };
}

// Purpose:
// Group list items into thread shells for the inbox (snippet-only bodies).
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function mailListItemsToThreads(items: MailListItem[]): MailThread[] {
  const groups = new Map<string, MailMessage[]>();

  for (const item of items) {
    const threadId = item.threadId ?? item.id;
    const existing = groups.get(threadId) ?? [];
    existing.push(listItemToMessage(item));
    groups.set(threadId, existing);
  }

  return [...groups.entries()]
    .map(([threadId, messages]) => buildThreadFromMessages(threadId, messages))
    .filter((thread): thread is MailThread => Boolean(thread))
    .sort(
      (a, b) =>
        Number(b.messages[0]?.internalDate ?? 0) -
        Number(a.messages[0]?.internalDate ?? 0),
    );
}

// Purpose:
// Build a full thread from cached detail rows (includes body text).
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function mailDetailItemsToThread(
  threadId: string,
  items: MailDetailItem[],
): MailThread | undefined {
  const messages = items.map(detailItemToMessage);
  return buildThreadFromMessages(threadId, messages);
}
