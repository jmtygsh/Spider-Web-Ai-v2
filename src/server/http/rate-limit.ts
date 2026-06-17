import { fail } from "@/server/http/response";

/**
 * In-memory fixed-window rate limiter.
 *
 * Trade-off: counts live in this process's memory, so limits are enforced
 * per-instance, not globally. That's fine for a single Node server and for
 * local/dev, but a multi-instance/serverless deployment should swap the store
 * for a shared backend (e.g. Upstash Redis). Only `rateLimit()` below needs to
 * change for that — callers use `checkRateLimit()` and stay untouched.
 */

export type RateLimitOptions = { limit: number; windowMs: number };

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  /** Epoch ms at which the current window resets. */
  reset: number;
};

type Bucket = { count: number; resetAt: number };

// Persist the store across dev HMR reloads (mirrors the db connection cache).
const globalForRateLimit = globalThis as unknown as {
  rateLimitBuckets?: Map<string, Bucket>;
  rateLimitLastSweep?: number;
};

const buckets =
  globalForRateLimit.rateLimitBuckets ?? new Map<string, Bucket>();
globalForRateLimit.rateLimitBuckets = buckets;

const SWEEP_INTERVAL_MS = 60_000;

// Purpose:
// Removes expired rate-limit buckets from the in-memory store.
// Runs periodically during rateLimit calls to prevent unbounded memory growth.
// Handles current timestamp; expected result is cleaned bucket map.
function sweepExpired(now: number) {
  if (now - (globalForRateLimit.rateLimitLastSweep ?? 0) < SWEEP_INTERVAL_MS) {
    return;
  }
  globalForRateLimit.rateLimitLastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

// Purpose:
// Applies a fixed-window rate limit for a single key.
// Called directly or via checkRateLimit from API routes.
// Handles limit key and window options; expected result is success flag and remaining budget.
export function rateLimit(
  key: string,
  opts: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  sweepExpired(now);

  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    const resetAt = now + opts.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit: opts.limit,
      remaining: opts.limit - 1,
      reset: resetAt,
    };
  }

  if (bucket.count >= opts.limit) {
    return {
      success: false,
      limit: opts.limit,
      remaining: 0,
      reset: bucket.resetAt,
    };
  }

  bucket.count += 1;
  return {
    success: true,
    limit: opts.limit,
    remaining: opts.limit - bucket.count,
    reset: bucket.resetAt,
  };
}

// Purpose:
// Builds standard X-RateLimit-* response headers from a rate limit result.
// Called internally when constructing API responses.
// Handles RateLimitResult; expected result is header key/value map.
function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "X-RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
  };
}

/**
 * Convenience wrapper for route handlers.
 *
 * Returns `limited` as a ready-to-return 429 response when the budget is
 * exceeded (with `Retry-After` + rate headers), otherwise `null`. Either way it
 * returns `headers` to attach to the success response so clients always see
 * their remaining budget.
 */
// Purpose:
// Checks rate limit and returns either a 429 response or headers for success.
// Called at the top of rate-limited API routes.
// Handles limit key and options; expected result is limited response or header map.
export function checkRateLimit(
  key: string,
  opts: RateLimitOptions,
): {
  limited: import("next/server").NextResponse | null;
  headers: Record<string, string>;
} {
  const result = rateLimit(key, opts);
  const headers = rateLimitHeaders(result);

  if (!result.success) {
    const retryAfter = Math.max(
      0,
      Math.ceil((result.reset - Date.now()) / 1000),
    );
    return {
      limited: fail(
        429,
        "RATE_LIMITED",
        "Too many requests. Please slow down.",
        {
          ...headers,
          "Retry-After": String(retryAfter),
        },
      ),
      headers,
    };
  }

  return { limited: null, headers };
}
