import { upsertAgentRunEntity } from "@/features/agent-runtime/logic/upsert-agent-run-entity";
import type {
  AgentRun,
  FinalizeAgentRunInput,
} from "@/features/agent-runtime/types/agent-runtime";

export async function finalizeAgentRun(
  input: FinalizeAgentRunInput,
): Promise<AgentRun> {
  const finalizedRun: AgentRun = {
    ...input.run,
    status: input.status,
    finishedAt: new Date().toISOString(),
    contextVersion: input.contextVersion ?? input.run.contextVersion,
    outcome: input.outcome ?? null,
    error: input.error ?? null,
    version: `${input.status}:${Date.now()}`,
  };

  await upsertAgentRunEntity({
    accountId: finalizedRun.accountId,
    entityId: finalizedRun.id,
    version: finalizedRun.version,
    data: finalizedRun,
  });

  return finalizedRun;
}
