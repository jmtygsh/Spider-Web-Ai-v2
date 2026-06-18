import type { RateLimitOptions } from "@/server/http/rate-limit";

/** Per-tenant limits on expensive AI/agent endpoints. */
export const RATE_LIMITS = {
  chat: { limit: 30, windowMs: 60_000 },
  commandPreview: { limit: 60, windowMs: 60_000 },
  commandExecute: { limit: 20, windowMs: 60_000 },
  eventsPoll: { limit: 120, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitOptions>;
