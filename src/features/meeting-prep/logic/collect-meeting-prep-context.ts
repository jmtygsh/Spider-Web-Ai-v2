import {
  loadCommitmentExtractions,
  loadMessageProjectionsForThreads,
  loadOpenActionLinks,
  loadThreadMeetingLinks,
  loadThreadProjections,
  loadTopicExtractions,
} from "@/features/meeting-prep/logic/meeting-prep-store";
import { upsertMeetingPrepEntity } from "@/features/meeting-prep/logic/upsert-meeting-prep-entity";
import type {
  CollectMeetingPrepContextInput,
  MeetingPrepContext,
} from "@/features/meeting-prep/types/meeting-prep";

function detectMissingDocs(input: {
  relatedThreads: MeetingPrepContext["relatedThreads"];
  topics: string[];
}) {
  const threadText = input.relatedThreads
    .flatMap((thread) => [thread.subject, thread.snippet])
    .filter((value): value is string => !!value)
    .join(" ")
    .toLowerCase();
  const missingDocs: string[] = [];

  if (/\b(contract|agreement)\b/.test(threadText) && !/\battached\b/.test(threadText)) {
    missingDocs.push("contract");
  }
  if (/\bproposal\b/.test(threadText) && !/\bdeck\b|\bdoc\b|\battachment\b/.test(threadText)) {
    missingDocs.push("proposal");
  }
  if (
    input.topics.some((topic) => topic.includes("pricing")) &&
    !/\bprice sheet\b|\bpricing doc\b|\bquote\b/.test(threadText)
  ) {
    missingDocs.push("pricing doc");
  }

  return Array.from(new Set(missingDocs));
}

export async function collectMeetingPrepContext(
  input: CollectMeetingPrepContextInput,
): Promise<MeetingPrepContext> {
  const threadLinks = await loadThreadMeetingLinks({
    accountId: input.accountId,
    meetingId: input.meeting.externalMeetingId,
  });
  const threadIds = threadLinks.map((link) => link.threadId);
  const relatedThreads = await loadThreadProjections({
    accountId: input.accountId,
    threadIds,
  });
  const recentMessages = (await loadMessageProjectionsForThreads({
    accountId: input.accountId,
    threadIds,
  })).slice(0, 10);
  const commitmentExtractions = await loadCommitmentExtractions({
    accountId: input.accountId,
    threadIds,
  });
  const topicExtractions = await loadTopicExtractions({
    accountId: input.accountId,
    threadIds,
  });
  const actionLinks = await loadOpenActionLinks({
    accountId: input.accountId,
    meetingId: input.meeting.externalMeetingId,
    threadIds,
  });

  const openAsks = commitmentExtractions.flatMap((entry) =>
    entry.commitments.filter((commitment) => commitment.status === "open"),
  );
  const priorTopics = Array.from(
    new Set(
      topicExtractions.flatMap((entry) => entry.topics.map((topic) => topic.label)),
    ),
  ).slice(0, 8);

  const context: MeetingPrepContext = {
    id: `${input.accountId}:meeting-prep-context:${input.meeting.externalMeetingId}`,
    accountId: input.accountId,
    entityType: "meeting_prep_context",
    meetingId: input.meeting.externalMeetingId,
    participants: [
      ...(input.meeting.organizer
        ? [
            {
              email: input.meeting.organizer.email,
              name: input.meeting.organizer.name,
              role: "organizer" as const,
              responseStatus: null,
            },
          ]
        : []),
      ...(input.meeting.creator
        ? [
            {
              email: input.meeting.creator.email,
              name: input.meeting.creator.name,
              role: "creator" as const,
              responseStatus: null,
            },
          ]
        : []),
      ...input.meeting.attendees.map((attendee) => ({
        email: attendee.email,
        name: attendee.name,
        role: "attendee" as const,
        responseStatus: attendee.responseStatus,
      })),
    ],
    relatedThreads,
    recentMessages,
    openAsks,
    missingDocs: detectMissingDocs({ relatedThreads, topics: priorTopics }),
    priorTopics,
    threadLinks,
    actionLinks,
    commitmentExtractions,
    topicExtractions,
    version: `${input.meeting.version}:${threadLinks.map((link) => link.score).join(",")}`,
  };

  await upsertMeetingPrepEntity({
    accountId: input.accountId,
    entityId: input.meeting.externalMeetingId,
    entityType: context.entityType,
    version: context.version,
    data: context,
  });

  return context;
}
