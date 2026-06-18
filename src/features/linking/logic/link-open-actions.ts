import {
  jaccardSimilarity,
  meetingParticipantEmails,
  tokenize,
} from "@/features/linking/logic/linking-helpers";
import { upsertLinkEntity } from "@/features/linking/logic/upsert-link-entity";
import type {
  LinkOpenActionsInput,
  LinkOpenActionsResult,
  OpenActionInput,
  OpenActionLink,
} from "@/features/linking/types/linking";
import type { MeetingProjection, ThreadProjection } from "@/features/projection-sync";

function actionTokens(action: OpenActionInput): string[] {
  return Array.from(
    new Set([
      ...tokenize(action.title),
      ...tokenize(action.description),
      ...(action.topics ?? []).flatMap((topic) => tokenize(topic)),
    ]),
  );
}

function scoreActionAgainstThread(
  action: OpenActionInput,
  tokens: string[],
  thread: ThreadProjection,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (action.relatedThreadId && action.relatedThreadId === thread.externalThreadId) {
    score += 0.6;
    reasons.push("explicit thread reference");
  }

  const ownerEmail = action.ownerEmail?.toLowerCase() ?? null;
  if (ownerEmail && thread.participantEmails.includes(ownerEmail)) {
    score += 0.2;
    reasons.push("owner in thread");
  }

  const overlap = jaccardSimilarity(
    tokens,
    Array.from(new Set([...tokenize(thread.subject), ...tokenize(thread.snippet)])),
  );
  if (overlap > 0) {
    score += overlap * 0.2;
    reasons.push("thread topic overlap");
  }

  return { score, reasons };
}

function scoreActionAgainstMeeting(
  action: OpenActionInput,
  tokens: string[],
  meeting: MeetingProjection,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (action.relatedMeetingId && action.relatedMeetingId === meeting.externalMeetingId) {
    score += 0.6;
    reasons.push("explicit meeting reference");
  }

  const actionEmails = Array.from(
    new Set(
      [action.ownerEmail ?? null, ...(action.participantEmails ?? [])]
        .map((value) => value?.toLowerCase() ?? null)
        .filter((value): value is string => !!value),
    ),
  );
  const meetingEmails = meetingParticipantEmails(meeting);
  const participantMatches = actionEmails.filter((email) => meetingEmails.includes(email)).length;
  if (participantMatches > 0) {
    score += Math.min(0.25, participantMatches * 0.1);
    reasons.push("action people in meeting");
  }

  const overlap = jaccardSimilarity(
    tokens,
    Array.from(new Set([...tokenize(meeting.title), ...tokenize(meeting.description)])),
  );
  if (overlap > 0) {
    score += overlap * 0.15;
    reasons.push("meeting topic overlap");
  }

  if (action.dueAt && meeting.startAt) {
    const diffHours =
      Math.abs(Date.parse(action.dueAt) - Date.parse(meeting.startAt)) /
      (1000 * 60 * 60);
    if (diffHours <= 48) {
      score += 0.1;
      reasons.push("due near meeting");
    }
  }

  return { score, reasons };
}

export async function linkOpenActions(
  input: LinkOpenActionsInput,
): Promise<LinkOpenActionsResult> {
  const links: OpenActionLink[] = [];

  for (const action of input.actions) {
    const tokens = actionTokens(action);
    const threadMatches = input.threads
      .map((thread) => ({
        thread,
        ...scoreActionAgainstThread(action, tokens, thread),
      }))
      .filter((match) => match.score >= 0.25)
      .sort((left, right) => right.score - left.score);

    const meetingMatches = input.meetings
      .map((meeting) => ({
        meeting,
        ...scoreActionAgainstMeeting(action, tokens, meeting),
      }))
      .filter((match) => match.score >= 0.25)
      .sort((left, right) => right.score - left.score);

    const bestThreadScore = threadMatches[0]?.score ?? 0;
    const bestMeetingScore = meetingMatches[0]?.score ?? 0;
    const link: OpenActionLink = {
      id: `${input.accountId}:open-action:${action.id}`,
      accountId: input.accountId,
      entityType: "open_action_link",
      actionId: action.id,
      threadIds: threadMatches.slice(0, 3).map((match) => match.thread.externalThreadId),
      meetingIds: meetingMatches
        .slice(0, 3)
        .map((match) => match.meeting.externalMeetingId),
      missingOn: [
        ...(threadMatches.length === 0 ? (["thread"] as const) : []),
        ...(meetingMatches.length === 0 ? (["meeting"] as const) : []),
      ],
      score: Number(Math.max(bestThreadScore, bestMeetingScore).toFixed(4)),
      reasons: Array.from(
        new Set([
          ...threadMatches.flatMap((match) => match.reasons),
          ...meetingMatches.flatMap((match) => match.reasons),
        ]),
      ),
    };

    await upsertLinkEntity({
      accountId: input.accountId,
      entityId: action.id,
      entityType: link.entityType,
      version: `${link.score}:${link.threadIds.join(",")}:${link.meetingIds.join(",")}`,
      data: link,
    });

    links.push(link);
  }

  return { links };
}
