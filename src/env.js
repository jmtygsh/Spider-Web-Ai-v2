// Purpose:
// Validates and exposes typed environment variables for server and client.
// Runs at import time during build and dev startup.
// Expected result: `env` object with schema-checked values or a build-time error.
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  // --- Server-side env (secrets, DB, third-party keys) ---
  server: {
    APP_URL: z.string().url(),
    // --- Auth (Better Auth + Google OAuth) ---
    BETTER_AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    BETTER_AUTH_GOOGLE_CLIENT_ID: z.string(),
    BETTER_AUTH_GOOGLE_CLIENT_SECRET: z.string(),
    // --- Database ---
    DATABASE_URL: z.string().url(),
    // --- AI and integrations ---
    // This key lets the app talk to OpenAI. Without it, chat AI cannot run.
    OPENAI_API_KEY:
      process.env.NODE_ENV === "production"
        ? z.string().trim().min(1)
        : z.string().trim().min(1).optional(),
    // This key encrypts third-party account tokens. Keep it strong and secret.
    CORSAIR_KEK:
      process.env.NODE_ENV === "production"
        ? z.string().trim().min(32)
        : z.string().trim().min(1).optional(),
    CORSAIR_WEBHOOK_SHARED_SECRET: z.string().trim().min(1).optional(),
    RESEND_API_KEY: z.string(),
    RESEND_FROM_EMAIL: z.string().optional(),
    // Full Pub/Sub topic for Gmail push, e.g. projects/my-app/topics/gmail-push
    GOOGLE_PUBSUB_TOPIC_ID: z.string().optional(),
    TAVILY_API_KEY: z.string().optional(),
    // --- Background jobs (Inngest) ---
    INNGEST_EVENT_KEY: z.string().optional(),
    INNGEST_SIGNING_KEY: z.string().optional(),
    // --- Runtime and observability ---
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    OTEL_SERVICE_NAME: z.string().optional(),
    // --- Rate limiting (Upstash Redis) ---
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  // --- Client-side env (NEXT_PUBLIC_* only) ---
  client: {
    NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  // --- Maps process.env keys to validated schema fields ---
  runtimeEnv: {
    APP_URL: process.env.APP_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_GOOGLE_CLIENT_ID: process.env.BETTER_AUTH_GOOGLE_CLIENT_ID,
    BETTER_AUTH_GOOGLE_CLIENT_SECRET:
      process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    CORSAIR_KEK: process.env.CORSAIR_KEK,
    CORSAIR_WEBHOOK_SHARED_SECRET: process.env.CORSAIR_WEBHOOK_SHARED_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    GOOGLE_PUBSUB_TOPIC_ID: process.env.GOOGLE_PUBSUB_TOPIC_ID,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
    INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
    NODE_ENV: process.env.NODE_ENV,
    OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
