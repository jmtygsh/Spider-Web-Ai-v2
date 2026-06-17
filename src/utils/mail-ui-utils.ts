import type {
  MailAddress,
  MailFolder,
  MailFolderItem,
  MailMessage,
  MailThread,
  MailThreadListItem,
} from "@/types/mail-ui";

const FOLDER_LABELS: Record<MailFolder, string> = {
  inbox: "Inbox",
  drafts: "Drafts",
  sent: "Sent",
  spam: "Spam",
  trash: "Trash",
  archive: "Archive",
};

const FOLDER_ORDER: MailFolder[] = [
  "inbox",
  "drafts",
  "sent",
  "spam",
  "trash",
  "archive",
];

function sortMessages(messages: MailMessage[]) {
  return [...messages].sort(
    (a, b) => Number(b.internalDate ?? 0) - Number(a.internalDate ?? 0),
  );
}

// Purpose:
// Return the newest message in a thread (by internalDate).
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function getThreadLatestMessage(thread: MailThread): MailMessage {
  const latest = sortMessages(thread.messages)[0] ?? thread.messages[0];

  if (!latest) {
    throw new Error(`Thread ${thread.id} does not contain any messages.`);
  }

  return latest;
}

// Purpose:
// All messages in a thread, newest first.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function getThreadConversation(thread: MailThread): MailMessage[] {
  return sortMessages(thread.messages);
}

// Purpose:
// Compact relative time for list rows (e.g. "5m", "2h", "3d").
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function formatMailRelativeTime(value: string) {
  const time = Number(value);

  if (Number.isNaN(time)) {
    return "";
  }

  const diff = Date.now() - time;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < hour) {
    return `${Math.max(1, Math.floor(diff / minute))}m`;
  }

  if (diff < day) {
    return `${Math.floor(diff / hour)}h`;
  }

  if (diff < 7 * day) {
    return `${Math.floor(diff / day)}d`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(time));
}

// Purpose:
// Full date + time label for mail preview headers.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function formatMailTimestamp(value: string) {
  const time = Number(value);

  if (Number.isNaN(time)) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(time));
}

// Purpose:
// Build sidebar folder list with thread counts per virtual folder.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function buildFolderItems(threads: MailThread[]): MailFolderItem[] {
  return FOLDER_ORDER.map((folder) => ({
    id: folder,
    label: FOLDER_LABELS[folder],
    count: threads.filter((thread) => thread.folder === folder).length,
  }));
}

// Purpose:
// Filter threads by folder and optional search query; sort newest first.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function filterThreads(
  threads: MailThread[],
  folder: MailFolder,
  query: string,
) {
  const search = query.trim().toLowerCase();

  return threads
    .filter((thread) => thread.folder === folder)
    .filter((thread) => {
      if (!search) {
        return true;
      }

      const latest = getThreadLatestMessage(thread);
      const haystack = [
        latest.subject,
        latest.snippet,
        latest.from.name,
        latest.from.email,
        ...latest.body,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    })
    .sort(
      (a, b) =>
        Number(getThreadLatestMessage(b).internalDate ?? 0) -
        Number(getThreadLatestMessage(a).internalDate ?? 0),
    );
}

// Purpose:
// Flatten a MailThread into a single list-row item for the sidebar.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function buildThreadListItem(thread: MailThread): MailThreadListItem {
  const latest = getThreadLatestMessage(thread);

  return {
    id: thread.id,
    folder: thread.folder,
    sender: latest.from.name,
    senderEmail: latest.from.email,
    subject: latest.subject,
    snippet: latest.snippet,
    timestamp: formatMailTimestamp(latest.internalDate),
    relativeTime: formatMailRelativeTime(latest.internalDate),
    messageCount: thread.messages.length,
    isUnread: thread.isUnread || latest.isUnread === true,
    isStarred: thread.isStarred === true,
    accent: thread.accent,
  };
}

// Purpose:
// Two-letter initials from a participant display name.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function getThreadInitials(participant: MailAddress) {
  return participant.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

// Purpose:
// Read a header value by name from a message's headers array.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function getHeaderValue(
  message: MailMessage,
  name: string,
  fallback = "",
) {
  return (
    message.headers.find(
      (header) => header.name.toLowerCase() === name.toLowerCase(),
    )?.value ?? fallback
  );
}
