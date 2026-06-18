import {
  findCommitmentExtractions,
  findMeetingProjection,
  findPrepBriefs,
  findRelationshipProfile,
  findSuggestions,
  findThreadProjection,
  findTopTimelineItems,
  loadAgentRuntimeSourceRows,
} from "@/features/agent-runtime/logic/agent-runtime-store";
import type {
  AgentRunContext,
  BuildRunContextInput,
} from "@/features/agent-runtime/types/agent-runtime";

export async function buildRunContext(
  input: BuildRunContextInput,
): Promise<AgentRunContext> {
  const normalizedPersonEmail = input.relatedPersonEmail?.trim().toLowerCase() ?? null;
  const rows = await loadAgentRuntimeSourceRows(input.accountId);
  const relatedThread = findThreadProjection(rows, input.relatedThreadId);
  const relatedMeeting = findMeetingProjection(rows, input.relatedMeetingId);
  const relatedPerson = findRelationshipProfile(rows, normalizedPersonEmail);
  const prepBriefs = findPrepBriefs(
    rows,
    input.relatedMeetingId ?? relatedPerson?.lastMeeting?.externalMeetingId ?? null,
  );
  const commitments = findCommitmentExtractions(
    rows,
    input.relatedThreadId ?? relatedPerson?.threadLinks[0]?.threadId ?? null,
  );
  const suggestions = findSuggestions(rows, {
    threadId: input.relatedThreadId,
    meetingId: input.relatedMeetingId,
  });
  const topTimelineItems = findTopTimelineItems(rows, {
    threadId: input.relatedThreadId,
    meetingId: input.relatedMeetingId,
    personEmail: normalizedPersonEmail,
  });

  return {
    accountId: input.accountId,
    purpose: input.purpose,
    relatedThread,
    relatedMeeting,
    relatedPerson,
    prepBriefs,
    commitments,
    suggestions,
    topTimelineItems,
    version: [
      input.purpose,
      relatedThread?.version ?? "none",
      relatedMeeting?.version ?? "none",
      relatedPerson?.version ?? "none",
      prepBriefs.map((entry) => entry.version).join("|") || "none",
      commitments.map((entry) => entry.version).join("|") || "none",
      suggestions.map((entry) => entry.version).join("|") || "none",
      topTimelineItems.map((entry) => entry.id).join("|") || "none",
    ].join(":"),
  };
}
