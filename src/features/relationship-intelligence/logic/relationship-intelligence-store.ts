import { eq } from "drizzle-orm";

import type {
  CommitmentExtractionResult,
  TopicExtractionResult,
} from "@/features/extraction";
import type {
  PersonAnchor,
  PersonMeetingLink,
  PersonThreadLink,
} from "@/features/linking";
import type {
  MessageProjection,
  MeetingProjection,
  ThreadProjection,
} from "@/features/projection-sync";
import type { RelationshipProfileStoreBundle } from "@/features/relationship-intelligence/types/relationship-intelligence";
import { db } from "@/server/db";
import { corsairEntities } from "@/server/db/schema";

type EntityRow = typeof corsairEntities.$inferSelect;

function castEntityData<T>(row: EntityRow): T {
  return row.data as T;
}

export async function loadRelationshipProfileBundle(input: {
  accountId: string;
  personEmail: string;
}): Promise<RelationshipProfileStoreBundle> {
  const personEmail = input.personEmail.trim().toLowerCase();
  const rows = await db
    .select()
    .from(corsairEntities)
    .where(eq(corsairEntities.accountId, input.accountId));

  const anchor =
    rows
      .filter((row) => row.entityType === "person_anchor")
      .map((row) => castEntityData<PersonAnchor>(row))
      .find((entry) => entry.email === personEmail) ?? null;

  const threadLinks = rows
    .filter((row) => row.entityType === "person_thread_link")
    .map((row) => castEntityData<PersonThreadLink>(row))
    .filter((entry) => entry.personEmail === personEmail);

  const meetingLinks = rows
    .filter((row) => row.entityType === "person_meeting_link")
    .map((row) => castEntityData<PersonMeetingLink>(row))
    .filter((entry) => entry.personEmail === personEmail);

  const threadIds = new Set(threadLinks.map((entry) => entry.threadId));
  const meetingIds = new Set(meetingLinks.map((entry) => entry.meetingId));

  const threads = rows
    .filter((row) => row.entityType === "thread_projection")
    .map((row) => castEntityData<ThreadProjection>(row))
    .filter((entry) => threadIds.has(entry.externalThreadId));

  const meetings = rows
    .filter((row) => row.entityType === "meeting_projection")
    .map((row) => castEntityData<MeetingProjection>(row))
    .filter((entry) => meetingIds.has(entry.externalMeetingId));

  const messages = rows
    .filter((row) => row.entityType === "message_projection")
    .map((row) => castEntityData<MessageProjection>(row))
    .filter(
      (entry) =>
        !!entry.externalThreadId && threadIds.has(entry.externalThreadId),
    );

  const commitments = rows
    .filter((row) => row.entityType === "commitment_extraction")
    .map((row) => castEntityData<CommitmentExtractionResult>(row))
    .filter((entry) => threadIds.has(entry.threadId));

  const topics = rows
    .filter((row) => row.entityType === "topic_extraction")
    .map((row) => castEntityData<TopicExtractionResult>(row))
    .filter((entry) => threadIds.has(entry.threadId));

  return {
    anchor,
    threadLinks,
    meetingLinks,
    threads,
    meetings,
    messages,
    commitments,
    topics,
  };
}
