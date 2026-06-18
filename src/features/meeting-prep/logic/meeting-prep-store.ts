import { and, eq, inArray } from "drizzle-orm";

import type {
  CommitmentExtractionResult,
  TopicExtractionResult,
} from "@/features/extraction";
import type { OpenActionLink, ThreadMeetingLink } from "@/features/linking";
import type {
  MeetingProjection,
  MessageProjection,
  ThreadProjection,
} from "@/features/projection-sync";
import { db } from "@/server/db";
import { corsairEntities } from "@/server/db/schema";

type EntityRow = typeof corsairEntities.$inferSelect;

function castEntityData<T>(row: EntityRow): T {
  return row.data as T;
}

export async function loadThreadMeetingLinks(input: {
  accountId: string;
  meetingId: string;
}) {
  const rows = await db
    .select()
    .from(corsairEntities)
    .where(
      and(
        eq(corsairEntities.accountId, input.accountId),
        eq(corsairEntities.entityType, "thread_meeting_link"),
      ),
    );

  return rows
    .map((row) => castEntityData<ThreadMeetingLink>(row))
    .filter((link) => link.meetingId === input.meetingId && link.isLinked)
    .sort((left, right) => right.score - left.score);
}

export async function loadThreadProjections(input: {
  accountId: string;
  threadIds: string[];
}) {
  if (input.threadIds.length === 0) return [];

  const rows = await db
    .select()
    .from(corsairEntities)
    .where(
      and(
        eq(corsairEntities.accountId, input.accountId),
        eq(corsairEntities.entityType, "thread_projection"),
        inArray(corsairEntities.entityId, input.threadIds),
      ),
    );

  return rows.map((row) => castEntityData<ThreadProjection>(row));
}

export async function loadMessageProjectionsForThreads(input: {
  accountId: string;
  threadIds: string[];
}) {
  if (input.threadIds.length === 0) return [];

  const rows = await db
    .select()
    .from(corsairEntities)
    .where(
      and(
        eq(corsairEntities.accountId, input.accountId),
        eq(corsairEntities.entityType, "message_projection"),
      ),
    );

  return rows
    .map((row) => castEntityData<MessageProjection>(row))
    .filter(
      (message) =>
        !!message.externalThreadId &&
        input.threadIds.includes(message.externalThreadId),
    )
    .sort(
      (left, right) =>
        Number(right.internalDate ?? 0) - Number(left.internalDate ?? 0),
    );
}

export async function loadCommitmentExtractions(input: {
  accountId: string;
  threadIds: string[];
}) {
  if (input.threadIds.length === 0) return [];

  const rows = await db
    .select()
    .from(corsairEntities)
    .where(
      and(
        eq(corsairEntities.accountId, input.accountId),
        eq(corsairEntities.entityType, "commitment_extraction"),
        inArray(corsairEntities.entityId, input.threadIds),
      ),
    );

  return rows.map((row) => castEntityData<CommitmentExtractionResult>(row));
}

export async function loadTopicExtractions(input: {
  accountId: string;
  threadIds: string[];
}) {
  if (input.threadIds.length === 0) return [];

  const rows = await db
    .select()
    .from(corsairEntities)
    .where(
      and(
        eq(corsairEntities.accountId, input.accountId),
        eq(corsairEntities.entityType, "topic_extraction"),
        inArray(corsairEntities.entityId, input.threadIds),
      ),
    );

  return rows.map((row) => castEntityData<TopicExtractionResult>(row));
}

export async function loadOpenActionLinks(input: {
  accountId: string;
  meetingId: string;
  threadIds: string[];
}) {
  const rows = await db
    .select()
    .from(corsairEntities)
    .where(
      and(
        eq(corsairEntities.accountId, input.accountId),
        eq(corsairEntities.entityType, "open_action_link"),
      ),
    );

  return rows
    .map((row) => castEntityData<OpenActionLink>(row))
    .filter(
      (link) =>
        link.meetingIds.includes(input.meetingId) ||
        link.threadIds.some((threadId) => input.threadIds.includes(threadId)),
    )
    .sort((left, right) => right.score - left.score);
}

export async function loadMeetingProjection(input: {
  accountId: string;
  meetingId: string;
}) {
  const row = await db.query.corsairEntities.findFirst({
    where: and(
      eq(corsairEntities.accountId, input.accountId),
      eq(corsairEntities.entityType, "meeting_projection"),
      eq(corsairEntities.entityId, input.meetingId),
    ),
  });

  return row ? castEntityData<MeetingProjection>(row) : null;
}
