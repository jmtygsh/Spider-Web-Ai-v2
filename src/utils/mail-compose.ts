import type { MailMessage, MailThread } from "@/types/mail-ui";
import {
  formatMailTimestamp,
  getHeaderValue,
  getThreadConversation,
} from "@/utils/mail-ui-utils";

export type MailComposerMode = "new" | "reply" | "replyAll" | "forward" | "draft";

export type MailComposerDraftValues = {
  to: string;
  cc: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
};

function joinBody(lines: string[]) {
  return lines.join("\n\n").trim();
}

function splitHeaderAddresses(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function quoteMessageBody(lines: string[]) {
  return lines.map((line) => `> ${line}`).join("\n");
}

function formatReplySubject(subject: string) {
  return /^re:/i.test(subject.trim()) ? subject : `Re: ${subject}`;
}

function formatForwardSubject(subject: string) {
  return /^fwd:/i.test(subject.trim()) ? subject : `Fwd: ${subject}`;
}

function buildReplyRecipients(thread: MailThread) {
  const conversation = getThreadConversation(thread);
  const latest = conversation[0];

  if (!latest) {
    return { to: "", cc: "" };
  }

  const uniqueRecipients = new Map<string, string>();

  const addRecipient = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const key = trimmed.toLowerCase();
    if (!uniqueRecipients.has(key)) {
      uniqueRecipients.set(key, trimmed);
    }
  };

  for (const message of conversation) {
    addRecipient(message.from.email);
    for (const recipient of message.to) {
      addRecipient(recipient.email);
    }
    for (const recipient of splitHeaderAddresses(getHeaderValue(message, "Cc"))) {
      addRecipient(recipient);
    }
  }

  const to = latest.from.email.trim();
  uniqueRecipients.delete(to.toLowerCase());

  return {
    to,
    cc: [...uniqueRecipients.values()].join(", "),
  };
}

function buildReplyBody(message: MailMessage) {
  const header = `\n\nOn ${formatMailTimestamp(message.internalDate)}, ${message.from.name} wrote:\n`;
  return `${header}${quoteMessageBody(message.body)}`;
}

function buildForwardBody(message: MailMessage) {
  const fromLine = message.from.email
    ? `${message.from.name} <${message.from.email}>`
    : message.from.name;
  const toLine = message.to.map((person) => person.email).filter(Boolean).join(", ");

  return [
    "",
    "",
    "---------- Forwarded message ---------",
    `From: ${fromLine}`,
    `Date: ${formatMailTimestamp(message.internalDate)}`,
    `Subject: ${message.subject}`,
    toLine ? `To: ${toLine}` : "",
    "",
    joinBody(message.body),
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildComposeDraftValues(): MailComposerDraftValues {
  return {
    to: "",
    cc: "",
    subject: "",
    body: "",
  };
}

export function buildReplyDraftValues(
  thread: MailThread,
  mode: "reply" | "replyAll",
): MailComposerDraftValues {
  const conversation = getThreadConversation(thread);
  const latest = conversation[0];

  if (!latest) {
    return buildComposeDraftValues();
  }

  const recipients =
    mode === "reply"
      ? { to: latest.from.email, cc: "" }
      : buildReplyRecipients(thread);

  return {
    to: recipients.to,
    cc: recipients.cc,
    subject: formatReplySubject(latest.subject),
    body: buildReplyBody(latest),
    threadId: thread.id,
    inReplyTo: getHeaderValue(latest, "Message-ID") || undefined,
    references:
      getHeaderValue(latest, "References") ||
      getHeaderValue(latest, "Message-ID") ||
      undefined,
  };
}

export function buildForwardDraftValues(thread: MailThread): MailComposerDraftValues {
  const conversation = getThreadConversation(thread);
  const latest = conversation[0];

  if (!latest) {
    return buildComposeDraftValues();
  }

  return {
    to: "",
    cc: "",
    subject: formatForwardSubject(latest.subject),
    body: buildForwardBody(latest),
  };
}

export function buildDraftEditValues(thread: MailThread): MailComposerDraftValues {
  const conversation = getThreadConversation(thread);
  const latest = conversation[0];

  if (!latest) {
    return buildComposeDraftValues();
  }

  return {
    to: latest.to.map((person) => person.email).filter(Boolean).join(", "),
    cc: getHeaderValue(latest, "Cc"),
    subject: latest.subject,
    body: joinBody(latest.body),
    threadId: latest.threadId || undefined,
    inReplyTo: getHeaderValue(latest, "In-Reply-To") || undefined,
    references: getHeaderValue(latest, "References") || undefined,
  };
}
