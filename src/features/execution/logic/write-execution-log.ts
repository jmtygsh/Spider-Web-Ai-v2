import { insertExecutionLogEntity } from "@/features/execution/logic/upsert-execution-entity";
import type {
  ExecutionLogEntry,
  WriteExecutionLogInput,
} from "@/features/execution/types/execution";

export async function writeExecutionLog(
  input: WriteExecutionLogInput,
): Promise<ExecutionLogEntry> {
  const entry: ExecutionLogEntry = {
    id: `${input.runId}:${input.stepId ?? "run"}:${Date.now()}`,
    accountId: input.accountId,
    entityType: "execution_log",
    runId: input.runId,
    stepId: input.stepId ?? null,
    status: input.status,
    message: input.message,
    detail: input.detail ?? {},
    createdAt: new Date().toISOString(),
  };

  await insertExecutionLogEntity({
    accountId: input.accountId,
    entityType: entry.entityType,
    version: `${entry.status}:${entry.createdAt}`,
    data: entry,
  });

  return entry;
}
