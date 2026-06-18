import { eq } from "drizzle-orm";

import type { CommitmentExtractionResult } from "@/features/extraction";
import type { ExecutionLogEntry } from "@/features/execution";
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
import type { TimelineSourceBundle } from "@/features/timeline/types/timeline";
import { db } from "@/server/db";
import { corsairEntities } from "@/server/db/schema";

type EntityRow = typeof corsairEntities.$inferSelect;

function castEntityData<T>(row: EntityRow): T {
  return row.data as T;
}

export async function loadTimelineSourceBundle(
  accountId: string,
): Promise<TimelineSourceBundle> {
  const rows = await db
    .select()
    .from(corsairEntities)
    .where(eq(corsairEntities.accountId, accountId));

  return {
    meetings: rows
      .filter((row) => row.entityType === "meeting_projection")
      .map((row) => castEntityData<MeetingProjection>(row)),
    threads: rows
      .filter((row) => row.entityType === "thread_projection")
      .map((row) => castEntityData<ThreadProjection>(row)),
    commitments: rows
      .filter((row) => row.entityType === "commitment_extraction")
      .map((row) => castEntityData<CommitmentExtractionResult>(row)),
    prepBriefs: rows
      .filter((row) => row.entityType === "meeting_prep_brief")
      .map((row) => castEntityData<MeetingPrepBrief>(row)),
    replySuggestions: rows
      .filter((row) => row.entityType === "reply_suggestion")
      .map((row) => castEntityData<ReplySuggestion>(row)),
    meetingSuggestions: rows
      .filter((row) => row.entityType === "meeting_suggestion")
      .map((row) => castEntityData<MeetingSuggestion>(row)),
    nextBestActions: rows
      .filter((row) => row.entityType === "next_best_action_suggestion")
      .map((row) => castEntityData<NextBestActionSuggestion>(row)),
    executionLogs: rows
      .filter((row) => row.entityType === "execution_log")
      .map((row) => castEntityData<ExecutionLogEntry>(row)),
    relationshipProfiles: rows
      .filter((row) => row.entityType === "relationship_profile")
      .map((row) => castEntityData<RelationshipProfile>(row)),
  };
}
