import { upsertMeetingPrepEntity } from "@/features/meeting-prep/logic/upsert-meeting-prep-entity";
import type {
  GenerateMeetingPrepBriefInput,
  MeetingPrepBrief,
} from "@/features/meeting-prep/types/meeting-prep";

function buildSummary(input: GenerateMeetingPrepBriefInput): string {
  const participantCount = input.context.participants.length;
  const threadCount = input.context.relatedThreads.length;
  const askCount = input.context.openAsks.length;
  const topicPreview =
    input.context.priorTopics.slice(0, 3).join(", ") || "no clear topic cluster yet";

  return [
    `${input.meeting.title ?? "Upcoming meeting"} includes ${participantCount} participants.`,
    `Prep context links ${threadCount} related thread${threadCount === 1 ? "" : "s"} and ${askCount} open ask${askCount === 1 ? "" : "s"}.`,
    `Main context themes: ${topicPreview}.`,
  ].join(" ");
}

function buildRisks(input: GenerateMeetingPrepBriefInput): string[] {
  const risks: string[] = [];

  if (input.context.openAsks.length >= 3) {
    risks.push("Multiple open asks may block alignment before the meeting.");
  }
  if (input.context.missingDocs.length > 0) {
    risks.push(`Missing docs: ${input.context.missingDocs.join(", ")}.`);
  }
  const pendingAttendees = input.context.participants.filter(
    (participant) =>
      participant.role === "attendee" &&
      participant.responseStatus !== null &&
      participant.responseStatus !== "accepted",
  );
  if (pendingAttendees.length > 0) {
    risks.push("Some attendees have not accepted the invite.");
  }
  if (input.context.relatedThreads.length === 0) {
    risks.push("No related threads are linked yet, so context may be incomplete.");
  }

  return risks;
}

function buildSuggestedReply(input: GenerateMeetingPrepBriefInput): string | null {
  if (input.context.openAsks.length === 0 && input.context.missingDocs.length === 0) {
    return null;
  }

  const askPreview = input.context.openAsks
    .slice(0, 2)
    .map((ask) => ask.title)
    .join("; ");
  const docsPreview =
    input.context.missingDocs.length > 0
      ? ` Please share the ${input.context.missingDocs.join(" and ")} before the meeting.`
      : "";

  return `Before we meet, can we close these open items: ${askPreview}.${docsPreview}`;
}

function buildNextActions(input: GenerateMeetingPrepBriefInput): string[] {
  const actions: string[] = [];

  if (input.context.openAsks.length > 0) {
    actions.push(`Review ${input.context.openAsks.length} unresolved asks.`);
  }
  if (input.context.missingDocs.length > 0) {
    actions.push(`Request missing docs: ${input.context.missingDocs.join(", ")}.`);
  }
  if (input.context.relatedThreads.length > 0) {
    actions.push("Open the top related email thread before the meeting.");
  }
  if (input.context.priorTopics.length > 0) {
    actions.push(`Prepare to discuss: ${input.context.priorTopics.slice(0, 3).join(", ")}.`);
  }

  return actions.slice(0, 5);
}

export async function generateMeetingPrepBrief(
  input: GenerateMeetingPrepBriefInput,
): Promise<MeetingPrepBrief> {
  const brief: MeetingPrepBrief = {
    id: `${input.accountId}:meeting-prep-brief:${input.meeting.externalMeetingId}`,
    accountId: input.accountId,
    entityType: "meeting_prep_brief",
    meetingId: input.meeting.externalMeetingId,
    summary: buildSummary(input),
    unansweredCount: input.context.openAsks.length,
    topics: input.context.priorTopics.slice(0, 8),
    risks: buildRisks(input),
    suggestedReply: buildSuggestedReply(input),
    nextActions: buildNextActions(input),
    contextVersion: input.context.version,
    version: `${input.meeting.version}:${input.context.version}`,
  };

  await upsertMeetingPrepEntity({
    accountId: input.accountId,
    entityId: input.meeting.externalMeetingId,
    entityType: brief.entityType,
    version: brief.version,
    data: brief,
  });

  return brief;
}
