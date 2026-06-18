import * as Sentry from "@sentry/nextjs";

import { env } from "@/env";

export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
) {
  if (!env.SENTRY_DSN) {
    return;
  }

  Sentry.captureException(error, context ? { extra: context } : undefined);
}
