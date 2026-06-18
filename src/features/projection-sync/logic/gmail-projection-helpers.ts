import type {
  GmailHeader,
  GmailMessagePart,
  ProjectionParticipant,
} from "@/features/projection-sync/types/projection";

function getHeaderValue(
  headers: GmailHeader[] | null | undefined,
  name: string,
): string | null {
  const header = headers?.find(
    (item) => item.name?.toLowerCase() === name.toLowerCase(),
  );
  return header?.value?.trim() || null;
}

function parseMailboxEntry(value: string): ProjectionParticipant {
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:"?([^"]*)"?\s)?<?([^<>@\s]+@[^<>@\s]+)>?$/);
  if (!match) {
    return { email: trimmed || null, name: null };
  }

  const [, displayName, email] = match;
  return {
    email: email?.trim() || null,
    name: displayName?.trim() || null,
  };
}

export function parseMailboxList(value: string | null): ProjectionParticipant[] {
  if (!value) return [];

  return value
    .split(",")
    .map((entry) => parseMailboxEntry(entry))
    .filter((entry) => entry.email || entry.name);
}

function countAttachments(part: GmailMessagePart | null | undefined): number {
  if (!part) return 0;

  const current = part.filename?.trim() ? 1 : 0;
  const nested =
    part.parts?.reduce((sum, child) => sum + countAttachments(child), 0) ?? 0;
  return current + nested;
}

export function hasAttachments(part: GmailMessagePart | null | undefined): boolean {
  return countAttachments(part) > 0;
}

export function getPrimaryHeaders(part: GmailMessagePart | null | undefined) {
  const headers = part?.headers ?? [];

  return {
    subject: getHeaderValue(headers, "Subject"),
    from: parseMailboxEntry(getHeaderValue(headers, "From") ?? ""),
    sender: parseMailboxEntry(getHeaderValue(headers, "Sender") ?? ""),
    to: parseMailboxList(getHeaderValue(headers, "To")),
    cc: parseMailboxList(getHeaderValue(headers, "Cc")),
    bcc: parseMailboxList(getHeaderValue(headers, "Bcc")),
    replyTo: parseMailboxList(getHeaderValue(headers, "Reply-To")),
    date: getHeaderValue(headers, "Date"),
  };
}
