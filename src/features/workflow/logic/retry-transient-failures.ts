import { NonRetriableError, RetryAfterError } from "inngest";

type WorkflowStepTools = {
  run(id: string, fn: () => Promise<unknown>): Promise<unknown>;
};

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.trim() || error.name;
  }

  return typeof error === "string" ? error : "Unknown workflow failure.";
}

function classifyWorkflowError(error: unknown) {
  const message = normalizeErrorMessage(error);
  const normalized = message.toLowerCase();

  const isTransient =
    /\b(timeout|timed out|econnreset|socket hang up|network|temporar|rate limit|429|5\d\d|unavailable|try again)\b/i.test(
      normalized,
    );
  const isPermanent =
    /\b(denied|forbidden|unauthorized|not found|missing|required|invalid|unsupported|no .* found|ambiguous)\b/i.test(
      normalized,
    );

  if (isPermanent && !isTransient) {
    return new NonRetriableError(message, {
      cause: error instanceof Error ? error : undefined,
    });
  }

  if (isTransient) {
    return new RetryAfterError(message, "2m", {
      cause: error instanceof Error ? error : undefined,
    });
  }

  return error instanceof Error ? error : new Error(message);
}

export async function retryTransientFailures<T>(input: {
  step: WorkflowStepTools;
  stepId: string;
  operation: () => Promise<T>;
}): Promise<T> {
  // Problem:
  // background jobs fail at provider/model/network boundaries.
  // Why this shape:
  // classify failures inside each Inngest step so retries stay step-scoped
  // instead of restarting an entire workflow after one flaky boundary call.
  return (await input.step.run(input.stepId, async () => {
    try {
      return await input.operation();
    } catch (error) {
      throw classifyWorkflowError(error);
    }
  })) as T;
}
