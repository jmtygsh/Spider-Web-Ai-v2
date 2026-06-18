import { eq } from "drizzle-orm";

import type { CommitmentExtractionResult } from "@/features/extraction";
import type { MeetingPrepBrief } from "@/features/meeting-prep";
import type {
  MeetingProjection,
  ThreadProjection,
} from "@/features/projection-sync";
import type { RelationshipProfile } from "@/features/relationship-intelligence";
import type {
  MeetingSuggestion,
  NextBestActionSuggestion,
  ReplySuggestion,
} from "@/features/suggestions";
import type { TimelineProjection } from "@/features/timeline";
import { db } from "@/server/db";
import { corsairEntities } from "@/server/db/schema";

type EntityRow = typeof corsairEntities.$inferSelect;

function castEntityData<T>(row: EntityRow): T {
  return row.data as T;
}

export async function loadAgentRuntimeSourceRows(accountId: string) {
  return await db
    .select()
    .from(corsairEntities)
    .where(eq(corsairEntities.accountId, accountId));
}

export function findThreadProjection(
  rows: EntityRow[],
  threadId: string | null | undefined,
) {
  if (!threadId) return null;

  return (
    rows
      .filter((row) => row.entityType === "thread_projection")
      .map((row) => castEntityData<ThreadProjection>(row))
      .find((thread) => thread.externalThreadId === threadId) ?? null
  );
}

export function findMeetingProjection(
  rows: EntityRow[],
  meetingId: string | null | undefined,
) {
  if (!meetingId) return null;

  return (
    rows
      .filter((row) => row.entityType === "meeting_projection")
      .map((row) => castEntityData<MeetingProjection>(row))
      .find((meeting) => meeting.externalMeetingId === meetingId) ?? null
  );
}

export function findRelationshipProfile(
  rows: EntityRow[],
  personEmail: string | null | undefined,
) {
  if (!personEmail) return null;
  const normalizedEmail = personEmail.trim().toLowerCase();

  return (
    rows
      .filter((row) => row.entityType === "relationship_profile")
      .map((row) => castEntityData<RelationshipProfile>(row))
      .find((profile) => profile.personEmail === normalizedEmail) ?? null
  );
}

export function findPrepBriefs(
  rows: EntityRow[],
  meetingId: string | null | undefined,
) {
  const briefs = rows
    .filter((row) => row.entityType === "meeting_prep_brief")
    .map((row) => castEntityData<MeetingPrepBrief>(row));

  if (!meetingId) return briefs.slice(0, 3);
  return briefs.filter((brief) => brief.meetingId === meetingId).slice(0, 3);
}

export function findCommitmentExtractions(
  rows: EntityRow[],
  threadId: string | null | undefined,
) {
  const commitments = rows
    .filter((row) => row.entityType === "commitment_extraction")
    .map((row) => castEntityData<CommitmentExtractionResult>(row));

  if (!threadId) return commitments.slice(0, 4);
  return commitments.filter((entry) => entry.threadId === threadId).slice(0, 4);
}

export function findSuggestions(
  rows: EntityRow[],
  input: {
    threadId?: string | null;
    meetingId?: string | null;
  },
) {
  const replySuggestions = rows
    .filter((row) => row.entityType === "reply_suggestion")
    .map((row) => castEntityData<ReplySuggestion>(row))
    .filter((entry) => !input.threadId || entry.threadId === input.threadId);

  const meetingSuggestions = rows
    .filter((row) => row.entityType === "meeting_suggestion")
    .map((row) => castEntityData<MeetingSuggestion>(row))
    .filter((entry) => !input.threadId || entry.threadId === input.threadId);

  const nextBestActions = rows
    .filter((row) => row.entityType === "next_best_action_suggestion")
    .map((row) => castEntityData<NextBestActionSuggestion>(row))
    .filter((entry) => {
      if (input.threadId && input.meetingId) {
        return (
          entry.relatedThreadId === input.threadId ||
          entry.relatedMeetingId === input.meetingId
        );
      }
      if (input.threadId) {
        return entry.relatedThreadId === input.threadId;
      }
      if (input.meetingId) {
        return entry.relatedMeetingId === input.meetingId;
      }
      return true;
    });

  return [
    ...replySuggestions.slice(0, 2),
    ...meetingSuggestions.slice(0, 2),
    ...nextBestActions.slice(0, 2),
  ];
}

export function findTopTimelineItems(
  rows: EntityRow[],
  input: {
    threadId?: string | null;
    meetingId?: string | null;
    personEmail?: string | null;
  },
) {
  const projection =
    rows
      .filter((row) => row.entityType === "timeline_projection")
      .map((row) => castEntityData<TimelineProjection>(row))[0] ?? null;

  if (!projection) return [];

  const filtered = projection.items.filter(
    (item) => {
      if (
        input.threadId &&
        item.relatedThreadId === input.threadId
      ) {
        return true;
      }
      if (
        input.meetingId &&
        item.relatedMeetingId === input.meetingId
      ) {
        return true;
      }
      if (
        input.personEmail &&
        item.relatedPersonEmail === input.personEmail
      ) {
        return true;
      }
      return false;
    },
  );

  return (filtered.length > 0 ? filtered : projection.items).slice(0, 6);
}
