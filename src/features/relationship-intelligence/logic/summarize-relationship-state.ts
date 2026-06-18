import { upsertRelationshipEntity } from "@/features/relationship-intelligence/logic/upsert-relationship-entity";
import type {
  RelationshipSummary,
  SummarizeRelationshipStateInput,
} from "@/features/relationship-intelligence/types/relationship-intelligence";

function formatLatency(hours: number | null) {
  if (hours === null) return "unknown response speed";
  if (hours < 1) return "usually replies within the hour";
  if (hours < 24) return `usually replies within ${Math.round(hours)}h`;
  return `usually replies within ${Math.round(hours / 24)}d`;
}

export async function summarizeRelationshipState(
  input: SummarizeRelationshipStateInput,
): Promise<RelationshipSummary> {
  const name = input.profile.personName ?? input.profile.personEmail;
  const meetingText = input.profile.lastMeeting?.title
    ? `Last meeting: ${input.profile.lastMeeting.title}.`
    : "No meeting history is linked yet.";
  const openRequestText =
    input.profile.openRequests.length > 0
      ? `${input.profile.openRequests.length} open request(s) still need attention.`
      : "No open requests are currently tracked.";
  const topicText =
    input.profile.activeTopics.length > 0
      ? `Active topics: ${input.profile.activeTopics.slice(0, 3).join(", ")}.`
      : "Topic continuity is still limited.";

  const summaryText = [
    `${name} appears in ${input.profile.threadCount} thread(s) and ${input.profile.meetingCount} meeting(s).`,
    `${meetingText}`,
    `${formatLatency(input.profile.averageResponseLatencyHours)}.`,
    `${openRequestText}`,
    `${topicText}`,
  ].join(" ");

  const summary: RelationshipSummary = {
    id: `${input.accountId}:relationship-summary:${input.profile.personEmail}`,
    accountId: input.accountId,
    entityType: "relationship_summary",
    personEmail: input.profile.personEmail,
    summary: summaryText,
    version: input.profile.version,
  };

  await upsertRelationshipEntity({
    accountId: input.accountId,
    entityId: input.profile.personEmail,
    entityType: summary.entityType,
    version: summary.version,
    data: summary,
  });

  return summary;
}
