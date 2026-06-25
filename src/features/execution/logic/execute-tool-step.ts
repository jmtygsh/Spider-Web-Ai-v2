import { callCorsairExecutionOperation } from "@/features/integration-access";
import { loadMeetingProjection } from "@/features/meeting-prep/logic/meeting-prep-store";
import { refreshMeetingPrepOnChange } from "@/features/meeting-prep";
import type {
  ExecuteToolStepInput,
  ToolStepResult,
} from "@/features/execution/types/execution";

function toRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return value === undefined ? null : { value };
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

    const output = await callCorsairExecutionOperation({
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
