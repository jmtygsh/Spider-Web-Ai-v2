import type {
  VerificationResult,
  VerifyToolResultInput,
} from "@/features/execution/types/execution";

function hasAnyField(
  output: Record<string, unknown> | null,
  fields: string[],
): boolean {
  if (!output) return false;
  return fields.some((field) => {
    const value = output[field];
    if (value !== undefined && value !== null && value !== "") {
      return true;
    }

    const data = output.data;
    if (typeof data === "object" && data !== null) {
      const nestedValue = (data as Record<string, unknown>)[field];
      return nestedValue !== undefined && nestedValue !== null && nestedValue !== "";
    }

    return false;
  });
}

export async function verifyToolResult(
  input: VerifyToolResultInput,
): Promise<VerificationResult> {
  if (input.result.status !== "succeeded") {
    return {
      stepId: input.step.id,
      verified: false,
      reason: input.result.error ?? "Step execution failed.",
    };
  }

  switch (input.step.verification.mode) {
    case "calendar_event_created":
      return {
        stepId: input.step.id,
        verified: hasAnyField(input.result.output, ["id", "eventId", "htmlLink"]),
        reason: hasAnyField(input.result.output, ["id", "eventId", "htmlLink"])
          ? "Calendar event result includes a created event identifier."
          : "Calendar event result lacks a stable identifier.",
      };
    case "gmail_reply_sent":
      return {
        stepId: input.step.id,
        verified: hasAnyField(input.result.output, ["id", "messageId", "draftId"]),
        reason: hasAnyField(input.result.output, ["id", "messageId", "draftId"])
          ? "Gmail reply result includes a message or draft identifier."
          : "Gmail reply result lacks a message identifier.",
      };
    case "thread_found": {
      const output = input.result.output;
      const arrayHit =
        Array.isArray(output?.threads) && output.threads.length > 0;
      const idHit = hasAnyField(output, ["id", "threadId"]);
      return {
        stepId: input.step.id,
        verified: arrayHit || idHit,
        reason: arrayHit || idHit
          ? "Thread lookup returned at least one candidate."
          : "Thread lookup did not return a verifiable thread result.",
      };
    }
    case "meeting_prep_generated":
      return {
        stepId: input.step.id,
        verified: hasAnyField(input.result.output, ["brief", "context"]),
        reason: hasAnyField(input.result.output, ["brief", "context"])
          ? "Meeting prep refresh returned both context and brief objects."
          : "Meeting prep refresh returned incomplete output.",
      };
    case "none":
    default:
      return {
        stepId: input.step.id,
        verified: true,
        reason: "No explicit verification required.",
      };
  }
}
