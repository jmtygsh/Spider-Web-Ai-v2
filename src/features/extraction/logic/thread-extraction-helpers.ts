import { createHash } from "node:crypto";

import { tokenize } from "@/features/linking/logic/linking-helpers";
import type { ThreadProjection } from "@/features/projection-sync";

const GENERIC_TOPIC_STOP_WORDS = new Set([
  "attached",
  "best",
  "email",
  "fwd",
  "hello",
  "hi",
  "thanks",
  "thank",
  "regards",
  "update",
]);

const SCHEDULING_PHRASES = [
  "book time",
  "calendar invite",
  "catch up",
  "find a time",
  "hop on a call",
  "jump on a call",
  "meet",
  "meeting",
  "reschedule",
  "schedule",
  "set up time",
  "sync",
];

const HIGH_SIGNAL_TOPIC_PHRASES = [
  "contract",
  "launch date",
  "pricing",
  "proposal",
  "renewal",
  "scope",
  "timeline",
];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function getRawThreadMessages(thread: ThreadProjection): Array<Record<string, unknown>> {
  const rawMessages = (thread.raw.messages ?? null) as unknown;
  if (!Array.isArray(rawMessages)) return [];

  return rawMessages.filter(
    (message): message is Record<string, unknown> =>
      typeof message === "object" && message !== null,
  );
}

function getMessageSnippets(thread: ThreadProjection): string[] {
  return getRawThreadMessages(thread)
    .map((message) =>
      typeof message.snippet === "string" ? message.snippet : null,
    )
    .filter((value): value is string => !!value)
    .map(normalizeWhitespace);
}

export function getThreadCorpus(thread: ThreadProjection): string[] {
  return Array.from(
    new Set(
      [thread.subject, thread.snippet, ...getMessageSnippets(thread)]
        .filter((value): value is string => !!value)
        .map(normalizeWhitespace)
        .filter(Boolean),
    ),
  );
}

export function getThreadText(thread: ThreadProjection): string {
  return getThreadCorpus(thread).join(". ");
}

export function splitIntoSentences(value: string): string[] {
  return value
    .split(/[\n\r]+|(?<=[.!?])\s+/)
    .map((sentence) => normalizeWhitespace(sentence))
    .filter((sentence) => sentence.length >= 8);
}

export function createStableExtractionId(...values: string[]): string {
  return createHash("sha256").update(values.join(":")).digest("hex");
}

export function extractCandidateTopics(thread: ThreadProjection): string[] {
  const corpus = getThreadCorpus(thread);
  const haystack = corpus.join(" ").toLowerCase();

  const phraseMatches = HIGH_SIGNAL_TOPIC_PHRASES.filter((phrase) =>
    haystack.includes(phrase),
  );

  const tokenCounts = new Map<string, number>();
  for (const token of tokenize(haystack)) {
    if (GENERIC_TOPIC_STOP_WORDS.has(token)) continue;
    tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
  }

  const frequentTokens = Array.from(tokenCounts.entries())
    .filter(([, count]) => count >= 1)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 8)
    .map(([token]) => token);

  return Array.from(new Set([...phraseMatches, ...frequentTokens]));
}

export function extractSchedulingSignals(thread: ThreadProjection) {
  const corpus = getThreadCorpus(thread);
  const haystack = corpus.join(" ").toLowerCase();
  const matchedPhrases = SCHEDULING_PHRASES.filter((phrase) =>
    haystack.includes(phrase),
  );
  const candidateTimeSlots = Array.from(
    new Set(
      corpus.flatMap((entry) => {
        const matches =
          entry.match(
            /\b(?:today|tomorrow|next week|next month|monday|tuesday|wednesday|thursday|friday|mon|tue|wed|thu|fri)(?:\s+(?:morning|afternoon|evening))?(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/gi,
          ) ?? [];
        const hourMatches =
          entry.match(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi) ?? [];
        return [...matches, ...hourMatches].map(normalizeWhitespace);
      }),
    ),
  );

  return {
    matchedPhrases,
    candidateTimeSlots,
  };
}

export function getThreadPurposeHint(thread: ThreadProjection): string | null {
  const subject = thread.subject?.trim() ?? null;
  if (subject) return subject;

  const topics = extractCandidateTopics(thread).slice(0, 3);
  return topics.length > 0 ? `Discuss ${topics.join(", ")}` : null;
}
