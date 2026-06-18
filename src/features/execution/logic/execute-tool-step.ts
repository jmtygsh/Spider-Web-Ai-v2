import { createWorkspaceCorsairClient } from "@/features/integration-access";
import { loadMeetingProjection } from "@/features/meeting-prep/logic/meeting-prep-store";
import { refreshMeetingPrepOnChange } from "@/features/meeting-prep";
import type {
  ExecuteToolStepInput,
  ToolStepResult,
} from "@/features/execution/types/execution";

type CorsairDynamicClient = Record<string, unknown>;

function toRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return value === undefined ? null : { value };
}

async function callCorsairOperation(input: {
  accountId: string;
  plugin: string;
  operation: string;
  payload: Record<string, unknown>;
}) {
  const client = (await createWorkspaceCorsairClient({
    accountId: input.accountId,
  })) as unknown as CorsairDynamicClient;
  const pluginSurface = client[input.plugin] as Record<string, unknown> | undefined;

  const directOperation = pluginSurface?.[input.operation];
  if (typeof directOperation === "function") {
    return await (directOperation as (payload: Record<string, unknown>) => Promise<unknown>)(
      input.payload,
    );
  }

  const actions = pluginSurface?.actions as Record<string, unknown> | undefined;
  const actionOperation = actions?.[input.operation];
  if (typeof actionOperation === "function") {
    return await (actionOperation as (payload: Record<string, unknown>) => Promise<unknown>)(
      input.payload,
    );
  }

  const execute = client.execute;
  if (typeof execute === "function") {
    return await (execute as (payload: Record<string, unknown>) => Promise<unknown>)({
      plugin: input.plugin,
      operation: input.operation,
      input: input.payload,
    });
  }

  throw new Error(
    `Corsair operation ${input.plugin}.${input.operation} is not available on the current client surface.`,
  );
}

export async function executeToolStep(
  input: ExecuteToolStepInput,
): Promise<ToolStepResult> {
  try {
    if (input.step.plugin === "internal") {
      if (input.step.action === "generate_meeting_prep") {
        const rawMeetingId = input.step.payload.meetingId;
        const meetingId =
          typeof rawMeetingId === "string" ? rawMeetingId : null;
        if (!meetingId) {
          return {
            stepId: input.step.id,
            status: "failed",
            output: null,
            error: "Meeting prep execution requires a string meetingId payload.",
          };
        }
        const meeting = await loadMeetingProjection({
          accountId: input.accountId,
          meetingId,
        });

        if (!meeting) {
          return {
            stepId: input.step.id,
            status: "failed",
            output: null,
            error: `Meeting ${meetingId} was not found for meeting prep refresh.`,
          };
        }

        const output = await refreshMeetingPrepOnChange({
          accountId: input.accountId,
          meeting,
        });

        return {
          stepId: input.step.id,
          status: "succeeded",
          output: toRecord(output),
          error: null,
        };
      }

      return {
        stepId: input.step.id,
        status: "failed",
        output: null,
        error: `Unsupported internal action: ${input.step.action}`,
      };
    }

    const output = await callCorsairOperation({
      accountId: input.accountId,
      plugin: input.step.plugin,
      operation: input.step.operation,
      payload: input.step.payload,
    });

    return {
      stepId: input.step.id,
      status: "succeeded",
      output: toRecord(output),
      error: null,
    };
  } catch (error) {
    return {
      stepId: input.step.id,
      status: "failed",
      output: null,
      error: error instanceof Error ? error.message : "Unknown execution error.",
    };
  }
}
