import type {
  ParseCommandIntentInput,
  ParsedCommandIntent,
} from "@/features/command-bar/types/command-bar";

const TIME_PATTERN =
  /\b(?:today|tomorrow|next week|next month|monday|tuesday|wednesday|thursday|friday|mon|tue|wed|thu|fri|\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/gi;
const PERSON_HINT_PATTERN = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi;

function normalizeCommand(command: string): string {
  return command.toLowerCase().replace(/\s+/g, " ").trim();
}

export function parseCommandIntent(
  input: ParseCommandIntentInput,
): ParsedCommandIntent {
  const normalized = normalizeCommand(input.command);
  const participantHints = Array.from(
    new Set(normalized.match(PERSON_HINT_PATTERN) ?? []),
  );
  const timeHints = Array.from(new Set(normalized.match(TIME_PATTERN) ?? []));

  let intent: ParsedCommandIntent["intent"] = "unknown";
  let confidence = 0.2;

  if (/\b(prep|prepare)\b/.test(normalized) && /\b(meeting|call|sync)\b/.test(normalized)) {
    intent = "prepare_meeting";
    confidence = 0.92;
  } else if (
    /\b(create|schedule|book|set up)\b/.test(normalized) &&
    /\b(meeting|call|sync)\b/.test(normalized)
  ) {
    intent = "create_meeting";
    confidence = 0.93;
  } else if (/\b(reply|respond|send)\b/.test(normalized)) {
    intent = "send_reply";
    confidence = /\b(email|reply)\b/.test(normalized) ? 0.86 : 0.72;
  } else if (/\b(find|search|open|show)\b/.test(normalized) && /\b(thread|email|message)\b/.test(normalized)) {
    intent = "find_thread";
    confidence = 0.88;
  }

  const queryText = normalized
    .replace(/\b(create|schedule|book|set up|prep|prepare|meeting|call|sync|reply|respond|send|find|search|open|show|thread|email|message)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    raw: input.command,
    normalized,
    intent,
    confidence,
    args: {
      queryText: queryText || null,
      participantHints,
      timeHints,
    },
  };
}
