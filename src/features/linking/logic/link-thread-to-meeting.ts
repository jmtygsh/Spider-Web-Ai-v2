import {
  combineTopicTokens,
  jaccardSimilarity,
  meetingParticipantEmails,
  overlapCount,
  participantEmails,
  schedulingLanguageScore,
  timingScore,
} from "@/features/linking/logic/linking-helpers";
import { upsertLinkEntity } from "@/features/linking/logic/upsert-link-entity";
import type {
  LinkThreadToMeetingInput,
  ThreadMeetingLink,
} from "@/features/linking/types/linking";

const THREAD_MEETING_LINK_THRESHOLD = 0.55;

export async function linkThreadToMeeting(
  input: LinkThreadToMeetingInput,
): Promise<ThreadMeetingLink> {
  const threadEmails = participantEmails(input.thread.participants);
  const meetingEmails = meetingParticipantEmails(input.meeting);
  const participantOverlap = overlapCount(threadEmails, meetingEmails);
  const participantOverlapScore =
    threadEmails.length === 0 || meetingEmails.length === 0
      ? 0
      : Math.min(1, participantOverlap / Math.min(threadEmails.length, meetingEmails.length));

  const subjectSimilarityScore = jaccardSimilarity(
    input.thread.subject ? input.thread.subject.split(/\s+/) : [],
    input.meeting.title ? input.meeting.title.split(/\s+/) : [],
  );
  const { threadTokens, meetingTokens } = combineTopicTokens(
    input.thread,
    input.meeting,
  );
  const topicScore = jaccardSimilarity(threadTokens, meetingTokens);
  const recentTimingScore = timingScore(input.thread, input.meeting);
  const scheduleScore = schedulingLanguageScore([
    input.thread.subject,
    input.thread.snippet,
    input.meeting.title,
    input.meeting.description,
  ]);

  const totalScore =
    participantOverlapScore * 0.35 +
    subjectSimilarityScore * 0.2 +
    recentTimingScore * 0.2 +
    topicScore * 0.15 +
    scheduleScore * 0.1;

  const reasons: string[] = [];
  if (participantOverlap > 0) {
    reasons.push(`shared participants: ${participantOverlap}`);
  }
  if (subjectSimilarityScore >= 0.3) {
    reasons.push("subject similarity");
  }
  if (recentTimingScore >= 0.6) {
    reasons.push("recent timing");
  }
  if (topicScore >= 0.25) {
    reasons.push("topic overlap");
  }
  if (scheduleScore > 0) {
    reasons.push("scheduling language");
  }

  const link: ThreadMeetingLink = {
    id: `${input.accountId}:thread-meeting:${input.thread.externalThreadId}:${input.meeting.externalMeetingId}`,
    accountId: input.accountId,
    entityType: "thread_meeting_link",
    threadId: input.thread.externalThreadId,
    meetingId: input.meeting.externalMeetingId,
    score: Number(totalScore.toFixed(4)),
    isLinked: totalScore >= THREAD_MEETING_LINK_THRESHOLD,
    reasons,
    breakdown: {
      participantOverlapScore: Number(participantOverlapScore.toFixed(4)),
      subjectSimilarityScore: Number(subjectSimilarityScore.toFixed(4)),
      timingScore: Number(recentTimingScore.toFixed(4)),
      topicScore: Number(topicScore.toFixed(4)),
      schedulingLanguageScore: Number(scheduleScore.toFixed(4)),
      totalScore: Number(totalScore.toFixed(4)),
    },
  };

  await upsertLinkEntity({
    accountId: input.accountId,
    entityId: `${input.thread.externalThreadId}:${input.meeting.externalMeetingId}`,
    entityType: link.entityType,
    version: `${input.thread.version}:${input.meeting.version}`,
    data: link,
  });

  return link;
}
