import { Redis } from "@upstash/redis";

import { env } from "@/env";

const globalForRedis = globalThis as unknown as {
  upstashRedis: Redis | null | undefined;
};

function createRedisClient(): Redis | null {
  return new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// Shared Upstash Redis client — null when credentials are not configured (graceful no-op).
export const redis = globalForRedis.upstashRedis ?? createRedisClient();

if (env.NODE_ENV !== "production") {
  globalForRedis.upstashRedis = redis;
}
