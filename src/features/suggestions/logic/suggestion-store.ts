import { and, eq } from "drizzle-orm";

import type {
  CommitmentExtractionResult,
  SchedulingIntentExtractionResult,
  TopicExtractionResult,
} from "@/features/extraction";
import type { MeetingPrepBrief } from "@/features/meeting-prep";
import type { MeetingProjection, ThreadProjection } from "@/features/projection-sync";
import { db } from "@/server/db";
import { corsairEntities } from "@/server/db/schema";

type EntityRow = typeof corsairEntities.$inferSelect;

function castEntityData<T>(row: EntityRow): T {
  return row.data as T;
}

export async function loadReplySuggestionInputs(input: {
  accountId: string;
  threadId: string;
}) {
  const rows = await db
    .select()
    .from(corsairEntities)
    .where(eq(corsairEntities.accountId, input.accountId));

  let thread: ThreadProjection | null = null;
  let commitments: CommitmentExtractionResult | null = null;
  let topics: TopicExtractionResult | null = null;
  let prepBrief: MeetingPrepBrief | null = null;

  for (const row of rows) {
    if (row.entityType === "thread_projection" && row.entityId === input.threadId) {
      thread = castEntityData<ThreadProjection>(row);
    }
    if (row.entityType === "commitment_extraction" && row.entityId === input.threadId) {
      commitments = castEntityData<CommitmentExtractionResult>(row);
    }
    if (row.entityType === "topic_extraction" && row.entityId === input.threadId) {
      topics = castEntityData<TopicExtractionResult>(row);
    }
  }

  if (thread) {
    const prepRows = await db
      .select()
      .from(corsairEntities)
      .where(
        and(
          eq(corsairEntities.accountId, input.accountId),
          eq(corsairEntities.entityType, "meeting_prep_brief"),
        ),
      );

    prepBrief =
      prepRows
        .map((row) => castEntityData<MeetingPrepBrief>(row))
        .find((entry) =>
          entry.summary.toLowerCase().includes((thread?.subject ?? "").toLowerCase()),
        ) ?? null;
  }

  return {
    thread,
    commitments,
    topics,
    prepBrief,
  };
}

export async function loadMeetingSuggestionInputs(input: {
  accountId: string;
  threadId: string;
}) {
  const rows = await db
    .select()
    .from(corsairEntities)
    .where(eq(corsairEntities.accountId, input.accountId));

  let thread: ThreadProjection | null = null;
  let schedulingIntent: SchedulingIntentExtractionResult | null = null;
  let topics: TopicExtractionResult | null = null;

  for (const row of rows) {
    if (row.entityType === "thread_projection" && row.entityId === input.threadId) {
      thread = castEntityData<ThreadProjection>(row);
    }
    if (
      row.entityType === "scheduling_intent_extraction" &&
      row.entityId === input.threadId
    ) {
      schedulingIntent = castEntityData<SchedulingIntentExtractionResult>(row);
    }
    if (row.entityType === "topic_extraction" && row.entityId === input.threadId) {
      topics = castEntityData<TopicExtractionResult>(row);
    }
  }

  return {
    thread,
    schedulingIntent,
    topics,
  };
}

export async function loadNextBestActionInputs(accountId: string) {
  const rows = await db
    .select()
    .from(corsairEntities)
    .where(eq(corsairEntities.accountId, accountId));

  return {
    threads: rows
      .filter((row) => row.entityType === "thread_projection")
      .map((row) => castEntityData<ThreadProjection>(row)),
    meetings: rows
      .filter((row) => row.entityType === "meeting_projection")
      .map((row) => castEntityData<MeetingProjection>(row)),
    prepBriefs: rows
      .filter((row) => row.entityType === "meeting_prep_brief")
      .map((row) => castEntityData<MeetingPrepBrief>(row)),
    commitmentExtractions: rows
      .filter((row) => row.entityType === "commitment_extraction")
      .map((row) => castEntityData<CommitmentExtractionResult>(row)),
  };
}
