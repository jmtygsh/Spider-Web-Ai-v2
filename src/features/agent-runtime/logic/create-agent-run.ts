import { randomUUID } from "node:crypto";

import { upsertAgentRunEntity } from "@/features/agent-runtime/logic/upsert-agent-run-entity";
import type {
  AgentRun,
  CreateAgentRunInput,
} from "@/features/agent-runtime/types/agent-runtime";

export async function createAgentRun(
  input: CreateAgentRunInput,
): Promise<AgentRun> {
  const run: AgentRun = {
    id: `${input.accountId}:agent-run:${randomUUID()}`,
    accountId: input.accountId,
    entityType: "agent_run",
    purpose: input.purpose,
    status: "running",
    model: input.model ?? null,
    relatedThreadId: input.relatedThreadId ?? null,
    relatedMeetingId: input.relatedMeetingId ?? null,
    relatedPersonEmail: input.relatedPersonEmail?.trim().toLowerCase() ?? null,
    inputSummary: input.inputSummary,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    contextVersion: null,
    outcome: null,
    error: null,
    version: `running:${Date.now()}`,
  };

  await upsertAgentRunEntity({
    accountId: input.accountId,
    entityId: run.id,
    version: run.version,
    data: run,
  });

  return run;
}
