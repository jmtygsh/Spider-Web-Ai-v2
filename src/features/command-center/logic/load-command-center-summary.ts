import { and, eq, inArray } from "drizzle-orm";
import { CONNECT_PLUGIN_IDS } from "@/constants/plugins";
import type { AgentRun } from "@/features/agent-runtime";
import type { CommandCenterSummary } from "@/features/command-center/types/summary";
import type {
  CommitmentExtractionResult,
  SchedulingIntentExtractionResult,
} from "@/features/extraction";
import type { ExecutionLogEntry } from "@/features/execution";
import { buildInboxTriageView } from "@/features/inbox-triage";
import type { InboxTriageAssignment } from "@/features/inbox-triage/types/triage-assignment";
import type { MeetingPrepBrief } from "@/features/meeting-prep";
import type { MeetingProjection, ThreadProjection } from "@/features/projection-sync";
import type {
  RelationshipProfile,
  RelationshipSummary,
} from "@/features/relationship-intelligence";
import {
  generateNextBestAction,
  type MeetingSuggestion,
  type NextBestActionSuggestion,
  type ReplySuggestion,
} from "@/features/suggestions";
import { loadNextBestActionInputs } from "@/features/suggestions/logic/suggestion-store";
import { projectTimelineItems, type TimelineProjection } from "@/features/timeline";
import { db } from "@/server/db";
import { corsairAccounts, corsairEntities, corsairIntegrations } from "@/server/db/schema";

type EntityRow = typeof corsairEntities.$inferSelect;

function castEntityData<T>(row: EntityRow): T {
  return row.data as T;
}

function compareDateDesc(left: string | null, right: string | null) {
  return Date.parse(right ?? "") - Date.parse(left ?? "");
}

function compareDateAsc(left: string | null, right: string | null) {
  return Date.parse(left ?? "") - Date.parse(right ?? "");
}

function compareNumberDesc(left: number, right: number) {
  return right - left;
}

function hasProjectableData(rows: EntityRow[]) {
  return rows.some((row) =>
    [
      "thread_projection",
      "meeting_projection",
      "meeting_prep_brief",
      "execution_log",
      "relationship_profile",
      "commitment_extraction",
    ].includes(row.entityType),
  );
}

export async function loadCommandCenterSummary(input: {
  tenantId: string;
}): Promise<CommandCenterSummary> {
  const accounts = await db
    .select({
      accountId: corsairAccounts.id,
      pluginId: corsairIntegrations.name,
    })
    .from(corsairAccounts)
    .innerJoin(
      corsairIntegrations,
      eq(corsairAccounts.integrationId, corsairIntegrations.id),
    )
    .where(
      and(
        eq(corsairAccounts.tenantId, input.tenantId),
        inArray(corsairIntegrations.name, [...CONNECT_PLUGIN_IDS]),
      ),
    );

  const accountIdByPlugin = new Map(accounts.map((account) => [account.pluginId, account.accountId]));
  const accountIds = accounts.map((account) => account.accountId);

  if (accountIds.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      connections: CONNECT_PLUGIN_IDS.map((pluginId) => ({
        pluginId,
        connected: false,
        accountId: null,
      })),
      nextBestAction: null,
      timelineItems: [],
      prepBriefs: [],
      relationshipProfiles: [],
      relationshipSummaries: [],
      meetingSuggestions: [],
      replySuggestions: [],
      inboxTriage: {
        actionRequired: [],
        schedule: [],
        fyi: [],
        later: [],
      },
      agentRuns: [],
      executionLogs: [],
      threads: [],
      meetings: [],
      stats: {
        connectedIntegrations: 0,
        timelineItems: 0,
        prepBriefs: 0,
        relationshipProfiles: 0,
        executionLogs: 0,
        threads: 0,
        meetings: 0,
        meetingSuggestions: 0,
        replySuggestions: 0,
        inboxTriageItems: 0,
        pendingAiScan: 0,
        agentRuns: 0,
      },
    };
  }

  const rows = await db
    .select()
    .from(corsairEntities)
    .where(inArray(corsairEntities.accountId, accountIds));

  const timelineProjectionByAccount = new Map<string, TimelineProjection>();
  const nextBestActionByAccount = new Map<string, NextBestActionSuggestion>();
  for (const row of rows) {
    if (row.entityType === "timeline_projection") {
      timelineProjectionByAccount.set(
        row.accountId,
        castEntityData<TimelineProjection>(row),
      );
    }
    if (row.entityType === "next_best_action_suggestion") {
      nextBestActionByAccount.set(
        row.accountId,
        castEntityData<NextBestActionSuggestion>(row),
      );
    }
  }

  const accountsNeedingProjection = accountIds.filter((accountId) => {
    if (timelineProjectionByAccount.has(accountId)) {
      return false;
    }

    return hasProjectableData(rows.filter((row) => row.accountId === accountId));
  });

  for (const accountId of accountsNeedingProjection) {
    const nextBestActionInputs = await loadNextBestActionInputs(accountId);
    const nextBestAction = await generateNextBestAction({
      accountId,
      ...nextBestActionInputs,
    });
    nextBestActionByAccount.set(accountId, nextBestAction);

    const projection = await projectTimelineItems({ accountId });
    timelineProjectionByAccount.set(accountId, projection);
  }

  const timelineItems = Array.from(timelineProjectionByAccount.values())
    .flatMap((projection) => projection.items)
    .sort((left, right) => {
      if (right.rankScore !== left.rankScore) {
        return right.rankScore - left.rankScore;
      }

      return compareDateDesc(left.eventAt, right.eventAt);
    });

  const prepBriefs = rows
    .filter((row) => row.entityType === "meeting_prep_brief")
    .map((row) => castEntityData<MeetingPrepBrief>(row))
    .sort((left, right) =>
      compareNumberDesc(left.unansweredCount, right.unansweredCount),
    );

  const relationshipProfiles = rows
    .filter((row) => row.entityType === "relationship_profile")
    .map((row) => castEntityData<RelationshipProfile>(row))
    .sort((left, right) => compareNumberDesc(left.emailCount, right.emailCount));

  const relationshipSummaries = rows
    .filter((row) => row.entityType === "relationship_summary")
    .map((row) => castEntityData<RelationshipSummary>(row));

  const meetingSuggestions = rows
    .filter((row) => row.entityType === "meeting_suggestion")
    .map((row) => castEntityData<MeetingSuggestion>(row))
    .sort((left, right) => compareNumberDesc(left.confidence, right.confidence));

  const replySuggestions = rows
    .filter((row) => row.entityType === "reply_suggestion")
    .map((row) => castEntityData<ReplySuggestion>(row))
    .sort((left, right) => compareNumberDesc(left.confidence, right.confidence));

  const commitments = rows
    .filter((row) => row.entityType === "commitment_extraction")
    .map((row) => castEntityData<CommitmentExtractionResult>(row));

  const schedulingIntents = rows
    .filter((row) => row.entityType === "scheduling_intent_extraction")
    .map((row) => castEntityData<SchedulingIntentExtractionResult>(row));

  const threads = rows
    .filter((row) => row.entityType === "thread_projection")
    .map((row) => castEntityData<ThreadProjection>(row))
    .sort((left, right) => compareDateDesc(left.lastMessageAt, right.lastMessageAt));

  const aiAssignments = rows
    .filter((row) => row.entityType === "inbox_triage_assignment")
    .map((row) => castEntityData<InboxTriageAssignment>(row));

  const agentRuns = rows
    .filter((row) => row.entityType === "agent_run")
    .map((row) => castEntityData<AgentRun>(row))
    .sort((left, right) => compareDateDesc(left.startedAt, right.startedAt));

  const pendingAiScan = rows.filter(
    (row) =>
      row.entityType === "thread_projection" && row.isRead === false,
  ).length;

  const inboxTriage = buildInboxTriageView({
    threads,
    commitments,
    schedulingIntents,
    aiAssignments,
  });

  const executionLogs = rows
    .filter((row) => row.entityType === "execution_log")
    .map((row) => castEntityData<ExecutionLogEntry>(row))
    .sort((left, right) => compareDateDesc(left.createdAt, right.createdAt));

  const meetings = rows
    .filter((row) => row.entityType === "meeting_projection")
    .map((row) => castEntityData<MeetingProjection>(row))
    .sort((left, right) => compareDateAsc(left.startAt, right.startAt));

  const nextBestAction =
    Array.from(nextBestActionByAccount.values()).sort((left, right) =>
      compareNumberDesc(left.confidence, right.confidence),
    )[0] ?? null;

  return {
    generatedAt: new Date().toISOString(),
    connections: CONNECT_PLUGIN_IDS.map((pluginId) => ({
      pluginId,
      connected: accountIdByPlugin.has(pluginId),
      accountId: accountIdByPlugin.get(pluginId) ?? null,
    })),
    nextBestAction,
    timelineItems,
    prepBriefs,
    relationshipProfiles,
    relationshipSummaries,
    meetingSuggestions,
    replySuggestions,
    inboxTriage,
    agentRuns,
    executionLogs,
    threads,
    meetings,
    stats: {
      connectedIntegrations: accounts.length,
      timelineItems: timelineItems.length,
      prepBriefs: prepBriefs.length,
      relationshipProfiles: relationshipProfiles.length,
      executionLogs: executionLogs.length,
      threads: threads.length,
      meetings: meetings.length,
      meetingSuggestions: meetingSuggestions.length,
      replySuggestions: replySuggestions.length,
      inboxTriageItems:
        inboxTriage.actionRequired.length +
        inboxTriage.schedule.length +
        inboxTriage.fyi.length +
        inboxTriage.later.length,
      pendingAiScan,
      agentRuns: agentRuns.length,
    },
  };
}
