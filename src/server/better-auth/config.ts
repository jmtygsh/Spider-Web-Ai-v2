import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { env } from "@/env";
import {
  sendPasswordChangedConfirmationEmail,
  sendPasswordResetLinkEmail,
  sendVerificationLinkEmail,
} from "@/server/configs/resend";
import { db } from "@/server/db";

// Purpose:
// Server-side Better Auth instance — sign-up, sessions, OAuth, and email flows.
// Runs on auth API routes and server code that validates sessions.
// Expected result: configured auth with Drizzle adapter, Google OAuth, and Resend emails.
export const auth = betterAuth({
  // Persist users, sessions, and accounts in Postgres via Drizzle.
  database: drizzleAdapter(db, {
    provider: "pg", // or "pg" or "mysql"
  }),
  baseURL: env.APP_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      // Fire-and-forget transactional email via Resend.
      void sendPasswordResetLinkEmail(user.email, url, user.name);
    },
    onPasswordReset: async ({ user }) => {
      void sendPasswordChangedConfirmationEmail(user.email, user.name);
      console.log(`Password for user ${user.email} has been reset.`);
    },
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendVerificationLinkEmail(user.email, url, user.name);
    },
    expiresIn: 3600,
  },
  rateLimit: {
    enabled: true,
    window: 10, // time window in seconds
    max: 100, // max requests in the window
  },
  socialProviders: {
    google: {
      prompt: "select_account", //ask the user to select an account
      clientId: env.BETTER_AUTH_GOOGLE_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,

      // According to the documentation,
      // you don't need to manually set the redirectURI
      // because Better Auth automatically constructs
      // the OAuth callback URL for you using the global baseURL configuration.
      // redirectURI: `${env.APP_URL}/api/auth/callback/google`,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
