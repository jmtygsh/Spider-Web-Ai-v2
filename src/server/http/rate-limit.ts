import type { NextResponse } from "next/server";

import { redis } from "@/server/configs/redis";
import { fail } from "@/server/http/response";

/**
 * Fixed-window rate limiter with Upstash Redis when configured, otherwise in-memory.
 *
 * Redis gives distributed limits across serverless instances. In-memory is fine for
 * local dev and single-node deploys.
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

const globalForRateLimit = globalThis as unknown as {
  rateLimitBuckets?: Map<string, Bucket>;
  rateLimitLastSweep?: number;
};

const buckets =
  globalForRateLimit.rateLimitBuckets ?? new Map<string, Bucket>();
globalForRateLimit.rateLimitBuckets = buckets;

const SWEEP_INTERVAL_MS = 60_000;

function sweepExpired(now: number) {
  if (now - (globalForRateLimit.rateLimitLastSweep ?? 0) < SWEEP_INTERVAL_MS) {
    return;
  }
  globalForRateLimit.rateLimitLastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

function memoryRateLimit(
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

async function redisRateLimit(
  key: string,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowId = Math.floor(now / opts.windowMs);
  const redisKey = `ratelimit:${key}:${windowId}`;
  const reset = (windowId + 1) * opts.windowMs;

  const count = await redis!.incr(redisKey);
  if (count === 1) {
    await redis!.expire(redisKey, Math.ceil(opts.windowMs / 1000));
  }

  return {
    success: count <= opts.limit,
    limit: opts.limit,
    remaining: Math.max(0, opts.limit - count),
    reset,
  };
}

export async function rateLimit(
  key: string,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  if (redis) {
    try {
      return await redisRateLimit(key, opts);
    } catch {
      return memoryRateLimit(key, opts);
    }
  }

  return memoryRateLimit(key, opts);
}

function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "X-RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
  };
}

export async function checkRateLimit(
  key: string,
  opts: RateLimitOptions,
): Promise<{
  limited: NextResponse | null;
  headers: Record<string, string>;
}> {
  const result = await rateLimit(key, opts);
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
