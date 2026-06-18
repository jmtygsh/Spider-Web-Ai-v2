import { rankTimelineItems } from "@/features/timeline/logic/rank-timeline-items";
import { loadTimelineSourceBundle } from "@/features/timeline/logic/timeline-store";
import { upsertTimelineProjection } from "@/features/timeline/logic/upsert-timeline-entity";
import type {
  ProjectTimelineItemsInput,
  TimelineItem,
  TimelineProjection,
} from "@/features/timeline/types/timeline";

function createMeetingItems(accountId: string, meetings: Awaited<ReturnType<typeof loadTimelineSourceBundle>>["meetings"]): TimelineItem[] {
  const now = Date.now();

  return meetings.map((meeting) => {
    const startAt = meeting.startAt ? Date.parse(meeting.startAt) : null;
    const hoursUntil = startAt !== null ? (startAt - now) / (1000 * 60 * 60) : null;
    const needsResponse = meeting.attendees.some(
      (attendee) => attendee.self && attendee.responseStatus === "needsAction",
    );

    return {
      id: `${accountId}:timeline:meeting:${meeting.externalMeetingId}`,
      accountId,
      kind: "meeting",
      title: meeting.title ?? "Upcoming meeting",
      summary: needsResponse
        ? "Meeting needs RSVP or calendar attention."
        : "Meeting is scheduled and tracked in the workspace timeline.",
      relatedThreadId: null,
      relatedMeetingId: meeting.externalMeetingId,
      relatedPersonEmail: meeting.organizer?.email ?? null,
      eventAt: meeting.startAt,
      urgencyScore:
        needsResponse ? 0.95 : hoursUntil !== null && hoursUntil < 24 ? 0.82 : 0.45,
      importanceScore: meeting.attendeeCount > 3 ? 0.8 : 0.62,
      relevanceScore: meeting.isCancelled ? 0.2 : 0.75,
      rankScore: 0,
      sourceType: "meeting_projection",
    };
  });
}

function createThreadItems(accountId: string, threads: Awaited<ReturnType<typeof loadTimelineSourceBundle>>["threads"]): TimelineItem[] {
  return threads.map((thread) => ({
    id: `${accountId}:timeline:thread:${thread.externalThreadId}`,
    accountId,
    kind: "thread",
    title: thread.subject ?? "Email thread",
    summary: thread.snippet ?? "Thread activity updated.",
    relatedThreadId: thread.externalThreadId,
    relatedMeetingId: null,
    relatedPersonEmail: thread.participantEmails[0] ?? null,
    eventAt: thread.lastMessageAt,
    urgencyScore: thread.labelIds.includes("UNREAD") ? 0.84 : 0.48,
    importanceScore: thread.messageCount >= 4 ? 0.72 : 0.55,
    relevanceScore: thread.participantEmails.length > 1 ? 0.74 : 0.52,
    rankScore: 0,
    sourceType: "thread_projection",
  }));
}

function createCommitmentItems(accountId: string, commitments: Awaited<ReturnType<typeof loadTimelineSourceBundle>>["commitments"]): TimelineItem[] {
  return commitments.flatMap((entry) =>
    entry.commitments.map((commitment) => ({
      id: `${accountId}:timeline:commitment:${commitment.id}`,
      accountId,
      kind: "commitment",
      title: commitment.title,
      summary: `Open ${commitment.kind.replace("_", " ")} from thread context.`,
      relatedThreadId: entry.threadId,
      relatedMeetingId: null,
      relatedPersonEmail: commitment.ownerEmail ?? commitment.participantEmails[0] ?? null,
      eventAt: null,
      urgencyScore: commitment.kind === "pending_ask" ? 0.9 : 0.78,
      importanceScore: commitment.confidence,
      relevanceScore: commitment.participantEmails.length > 1 ? 0.74 : 0.58,
      rankScore: 0,
      sourceType: "commitment_extraction",
    })),
  );
}

function createPrepItems(accountId: string, prepBriefs: Awaited<ReturnType<typeof loadTimelineSourceBundle>>["prepBriefs"]): TimelineItem[] {
  return prepBriefs.map((brief) => ({
    id: `${accountId}:timeline:prep:${brief.meetingId}`,
    accountId,
    kind: "meeting_prep",
    title: "Meeting prep brief",
    summary: `${brief.unansweredCount} unanswered item(s). ${brief.summary}`,
    relatedThreadId: null,
    relatedMeetingId: brief.meetingId,
    relatedPersonEmail: null,
    eventAt: null,
    urgencyScore: brief.unansweredCount > 0 ? 0.92 : 0.5,
    importanceScore: brief.risks.length > 0 ? 0.85 : 0.68,
    relevanceScore: brief.topics.length > 0 ? 0.73 : 0.55,
    rankScore: 0,
    sourceType: "meeting_prep_brief",
  }));
}

function createSuggestionItems(accountId: string, sourceBundle: Awaited<ReturnType<typeof loadTimelineSourceBundle>>): TimelineItem[] {
  return [
    ...sourceBundle.replySuggestions.map((suggestion) => ({
      id: `${accountId}:timeline:reply-suggestion:${suggestion.threadId}`,
      accountId,
      kind: "suggestion" as const,
      title: "Reply suggestion",
      summary: suggestion.reason,
      relatedThreadId: suggestion.threadId,
      relatedMeetingId: null,
      relatedPersonEmail: null,
      eventAt: null,
      urgencyScore: suggestion.confidence,
      importanceScore: 0.7,
      relevanceScore: 0.76,
      rankScore: 0,
      sourceType: "reply_suggestion" as const,
    })),
    ...sourceBundle.meetingSuggestions.map((suggestion) => ({
      id: `${accountId}:timeline:meeting-suggestion:${suggestion.threadId}`,
      accountId,
      kind: "suggestion" as const,
      title: "Meeting suggestion",
      summary: suggestion.reason,
      relatedThreadId: suggestion.threadId,
      relatedMeetingId: null,
      relatedPersonEmail: suggestion.meeting.attendeeEmails[0] ?? null,
      eventAt: null,
      urgencyScore: suggestion.confidence,
      importanceScore: 0.82,
      relevanceScore: 0.8,
      rankScore: 0,
      sourceType: "meeting_suggestion" as const,
    })),
    ...sourceBundle.nextBestActions.map((suggestion) => ({
      id: `${accountId}:timeline:next-best-action`,
      accountId,
      kind: "suggestion" as const,
      title: "Next best action",
      summary: suggestion.action,
      relatedThreadId: suggestion.relatedThreadId,
      relatedMeetingId: suggestion.relatedMeetingId,
      relatedPersonEmail: null,
      eventAt: null,
      urgencyScore: suggestion.confidence,
      importanceScore: 0.9,
      relevanceScore: 0.9,
      rankScore: 0,
      sourceType: "next_best_action_suggestion" as const,
    })),
  ];
}

function createExecutionItems(accountId: string, logs: Awaited<ReturnType<typeof loadTimelineSourceBundle>>["executionLogs"]): TimelineItem[] {
  return logs.map((log) => ({
    id: `${accountId}:timeline:execution:${log.id}`,
    accountId,
    kind: "execution",
    title: `Execution ${log.status}`,
    summary: log.message,
    relatedThreadId: null,
    relatedMeetingId: null,
    relatedPersonEmail: null,
    eventAt: log.createdAt,
    urgencyScore: log.status === "failed" || log.status === "unverified" ? 0.88 : 0.52,
    importanceScore: 0.65,
    relevanceScore: 0.56,
    rankScore: 0,
    sourceType: "execution_log",
  }));
}

function createRelationshipItems(accountId: string, profiles: Awaited<ReturnType<typeof loadTimelineSourceBundle>>["relationshipProfiles"]): TimelineItem[] {
  return profiles.map((profile) => ({
    id: `${accountId}:timeline:relationship:${profile.personEmail}`,
    accountId,
    kind: "relationship",
    title: profile.personName ?? profile.personEmail,
    summary:
      profile.openRequests.length > 0
        ? `${profile.openRequests.length} open request(s), active topics: ${profile.activeTopics.slice(0, 2).join(", ")}.`
        : `Relationship profile updated with ${profile.threadCount} thread(s) and ${profile.meetingCount} meeting(s).`,
    relatedThreadId: profile.threadLinks[0]?.threadId ?? null,
    relatedMeetingId: profile.lastMeeting?.externalMeetingId ?? null,
    relatedPersonEmail: profile.personEmail,
    eventAt: profile.lastMeeting?.startAt ?? null,
    urgencyScore: profile.openRequests.length > 0 ? 0.78 : 0.4,
    importanceScore: profile.meetingCount > 0 ? 0.72 : 0.58,
    relevanceScore: profile.threadCount > 0 ? 0.73 : 0.45,
    rankScore: 0,
    sourceType: "relationship_profile",
  }));
}

export async function projectTimelineItems(
  input: ProjectTimelineItemsInput,
): Promise<TimelineProjection> {
  const sourceBundle = await loadTimelineSourceBundle(input.accountId);

  const items = rankTimelineItems({
    items: [
      ...createMeetingItems(input.accountId, sourceBundle.meetings),
      ...createThreadItems(input.accountId, sourceBundle.threads),
      ...createCommitmentItems(input.accountId, sourceBundle.commitments),
      ...createPrepItems(input.accountId, sourceBundle.prepBriefs),
      ...createSuggestionItems(input.accountId, sourceBundle),
      ...createExecutionItems(input.accountId, sourceBundle.executionLogs),
      ...createRelationshipItems(input.accountId, sourceBundle.relationshipProfiles),
    ],
  });

  const projection: TimelineProjection = {
    id: `${input.accountId}:timeline-projection:workspace`,
    accountId: input.accountId,
    entityType: "timeline_projection",
    items,
    version: [
      sourceBundle.meetings.length,
      sourceBundle.threads.length,
      sourceBundle.commitments.length,
      sourceBundle.prepBriefs.length,
      sourceBundle.replySuggestions.length,
      sourceBundle.meetingSuggestions.length,
      sourceBundle.nextBestActions.length,
      sourceBundle.executionLogs.length,
      sourceBundle.relationshipProfiles.length,
    ].join(":"),
  };

  await upsertTimelineProjection({
    accountId: input.accountId,
    entityId: "workspace",
    version: projection.version,
    data: projection,
  });

  return projection;
}
