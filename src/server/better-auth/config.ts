import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { env } from "@/env";
import { dispatchAuthEmail } from "@/server/better-auth/dispatch-auth-email";
import {
  sendPasswordChangedConfirmationEmail,
  sendPasswordResetLinkEmail,
  sendVerificationLinkEmail,
} from "@/server/configs/resend";
import { db } from "@/server/db";

const verificationCallbackURL = `${env.APP_URL}/dashboard`;

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
      dispatchAuthEmail(
        sendPasswordResetLinkEmail(user.email, url, user.name),
        { flow: "password-reset", email: user.email },
      );
    },
    onExistingUserSignUp: async ({ user }, request) => {
      // With requireEmailVerification, duplicate sign-ups return success but do not
      // create a new user. Re-send verification for existing unverified accounts.
      if (user.emailVerified) {
        return;
      }

      await auth.api.sendVerificationEmail({
        body: {
          email: user.email,
          callbackURL: verificationCallbackURL,
        },
        headers: request?.headers,
      });
    },
    onPasswordReset: async ({ user }) => {
      dispatchAuthEmail(
        sendPasswordChangedConfirmationEmail(user.email, user.name),
        { flow: "password-changed", email: user.email },
      );
      console.log(`Password for user ${user.email} has been reset.`);
    },
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      dispatchAuthEmail(
        sendVerificationLinkEmail(user.email, url, user.name),
        { flow: "verification", email: user.email },
      );
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
