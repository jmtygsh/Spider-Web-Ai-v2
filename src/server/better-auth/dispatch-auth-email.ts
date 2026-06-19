import { captureException } from "@/server/observability/sentry";

// Purpose:
// Fire-and-forget auth emails without unhandled rejections.
// Better Auth recommends not awaiting sends (timing attacks); errors must still be caught.
export function dispatchAuthEmail(
  task: Promise<unknown>,
  context: Record<string, unknown>,
) {
  void task.catch((error) => {
    captureException(error, context);
    console.error("[auth] email send failed", error);
  });
}
