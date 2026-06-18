import type {
  MeetingProjection,
  ProjectionParticipant,
  ThreadProjection,
} from "@/features/projection-sync";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "at",
  "be",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "re",
  "the",
  "to",
  "with",
]);

const SCHEDULING_TERMS = [
  "agenda",
  "call",
  "calendar",
  "demo",
  "follow up",
  "follow-up",
  "invite",
  "meet",
  "meeting",
  "prep",
  "reschedule",
  "schedule",
  "slot",
  "sync",
];

function normalizeText(value: string | null | undefined): string {
  return value?.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim() ?? "";
}

export function tokenize(value: string | null | undefined): string[] {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

export function uniqueTokens(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.flatMap((value) => tokenize(value))));
}

export function jaccardSimilarity(left: string[], right: string[]): number {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  if (leftSet.size === 0 || rightSet.size === 0) return 0;

  const intersection = Array.from(leftSet).filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : intersection / union;
}

export function participantEmails(participants: ProjectionParticipant[]): string[] {
  return participants
    .map((participant) => participant.email?.toLowerCase() ?? null)
    .filter((value): value is string => !!value);
}

export function meetingParticipantEmails(meeting: MeetingProjection): string[] {
  return Array.from(
    new Set([
      meeting.organizer?.email?.toLowerCase() ?? null,
      meeting.creator?.email?.toLowerCase() ?? null,
      ...meeting.attendees.map((attendee) => attendee.email?.toLowerCase() ?? null),
    ].filter((value): value is string => !!value)),
  );
}

export function overlapCount(left: string[], right: string[]): number {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value)).length;
}

export function timingScore(thread: ThreadProjection, meeting: MeetingProjection): number {
  const threadTs = thread.lastMessageAt ? Number(thread.lastMessageAt) : NaN;
  const meetingTs = meeting.startAt ? Date.parse(meeting.startAt) : NaN;
  if (Number.isNaN(threadTs) || Number.isNaN(meetingTs)) return 0;

  const diffHours = Math.abs(meetingTs - threadTs) / (1000 * 60 * 60);
  if (diffHours <= 24) return 1;
  if (diffHours <= 72) return 0.6;
  if (diffHours <= 168) return 0.25;
  return 0;
}

export function schedulingLanguageScore(values: Array<string | null | undefined>): number {
  const haystack = normalizeText(values.join(" "));
  const hits = SCHEDULING_TERMS.filter((term) => haystack.includes(term)).length;
  if (hits >= 4) return 1;
  if (hits >= 2) return 0.6;
  if (hits >= 1) return 0.25;
  return 0;
}

export function combineTopicTokens(
  thread: ThreadProjection,
  meeting: MeetingProjection,
) {
  const threadTokens = uniqueTokens([
    thread.subject,
    thread.snippet,
    ...thread.participants.map((participant) => participant.name),
  ]);
  const meetingTokens = uniqueTokens([
    meeting.title,
    meeting.description,
    meeting.location,
    ...meeting.attendees.map((attendee) => attendee.name),
    meeting.organizer?.name,
    meeting.creator?.name,
  ]);

  return { threadTokens, meetingTokens };
}
