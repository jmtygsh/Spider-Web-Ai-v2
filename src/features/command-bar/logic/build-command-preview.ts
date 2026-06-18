import type {
  BuildCommandPreviewInput,
  CommandPreview,
} from "@/features/command-bar/types/command-bar";

function previewTitle(input: BuildCommandPreviewInput): string {
  switch (input.parsed.intent) {
    case "create_meeting":
      return "Create meeting";
    case "send_reply":
      return "Send reply";
    case "find_thread":
      return "Find thread";
    case "prepare_meeting":
      return "Prepare meeting";
    default:
      return "Review command";
  }
}

function previewSummary(input: BuildCommandPreviewInput): string {
  switch (input.parsed.intent) {
    case "create_meeting":
      return `Parsed a meeting creation command with ${input.resolved.persons.length} resolved people and ${input.resolved.timeHints.length} time hint(s).`;
    case "send_reply":
      return `Parsed a reply command with ${input.resolved.threads.length} candidate thread(s).`;
    case "find_thread":
      return `Parsed a thread lookup command with ${input.resolved.threads.length} candidate thread(s).`;
    case "prepare_meeting":
      return `Parsed a meeting prep command with ${input.resolved.meetings.length} candidate meeting(s).`;
    default:
      return "Command intent is unclear and needs clarification before execution.";
  }
}

function plannedSteps(input: BuildCommandPreviewInput): string[] {
  switch (input.parsed.intent) {
    case "create_meeting":
      return [
        "Confirm attendees and time window.",
        "Build a calendar event payload.",
        "Show final confirmation before execution.",
      ];
    case "send_reply":
      return [
        "Select the best matching thread.",
        "Draft the reply content.",
        "Show confirmation before sending.",
      ];
    case "find_thread":
      return [
        "Rank matching email threads.",
        "Open the best candidate.",
      ];
    case "prepare_meeting":
      return [
        "Select the best matching meeting.",
        "Collect meeting prep context.",
        "Generate the prep brief.",
      ];
    default:
      return [
        "Ask the user to rephrase with a supported execution intent.",
      ];
  }
}

function resolvedSummary(input: BuildCommandPreviewInput): string[] {
  return [
    ...input.resolved.persons
      .slice(0, 3)
      .map((person) => `Person: ${person.name ?? person.email} (${person.email})`),
    ...input.resolved.meetings
      .slice(0, 3)
      .map(
        (entry) =>
          `Meeting: ${entry.meeting.title ?? entry.meeting.externalMeetingId} (${entry.confidence})`,
      ),
    ...input.resolved.threads
      .slice(0, 3)
      .map(
        (entry) =>
          `Thread: ${entry.thread.subject ?? entry.thread.externalThreadId} (${entry.confidence})`,
      ),
    ...input.resolved.timeHints.map((timeHint) => `Time hint: ${timeHint}`),
  ];
}

function safeToExecute(input: BuildCommandPreviewInput): boolean {
  switch (input.parsed.intent) {
    case "create_meeting":
      return input.resolved.persons.length > 0 || input.resolved.timeHints.length > 0;
    case "send_reply":
    case "find_thread":
      return input.resolved.threads.length > 0;
    case "prepare_meeting":
      return input.resolved.meetings.length > 0;
    default:
      return false;
  }
}

export function buildCommandPreview(
  input: BuildCommandPreviewInput,
): CommandPreview {
  return {
    title: previewTitle(input),
    summary: previewSummary(input),
    plannedSteps: plannedSteps(input),
    resolvedSummary: resolvedSummary(input),
    safeToExecute: safeToExecute(input),
  };
}
