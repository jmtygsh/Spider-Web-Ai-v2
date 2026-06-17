import type { ReactElement } from "react";

import { Resend } from "resend";

import {
  GenericEmailTemplate,
  PasswordResetEmailTemplate,
  VerificationEmailTemplate,
  WelcomeEmailTemplate,
} from "@/components/mail-templates/email-template";
import { env } from "@/env";

const resend = new Resend(env.RESEND_API_KEY);
// Default sender when RESEND_FROM_EMAIL is not configured.
const defaultFrom = env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

type SendEmailInput = {
  to: string | string[];
  subject: string;
  react: ReactElement;
};

// Purpose:
// Sends a transactional email through Resend with a React template body.
// Called by all public send* helpers in this module.
// Handles recipient, subject, and template; expected result is Resend send metadata.
async function sendEmail({ to, subject, react }: SendEmailInput) {
  const { data, error } = await resend.emails.send({
    from: defaultFrom,
    to: Array.isArray(to) ? to : [to],
    subject,
    react,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Purpose:
// Sends the post-sign-up welcome email with a dashboard link.
// Runs after a new user completes registration (when wired).
// Handles recipient email and optional name; expected result is Resend send metadata.
export function sendWelcomeEmail(to: string, firstName?: string | null) {
  return sendEmail({
    to,
    subject: "Welcome to Spider Web",
    react: WelcomeEmailTemplate({
      firstName,
      dashboardUrl: `${env.APP_URL}/dashboard`,
    }),
  });
}

// Purpose:
// Sends the email verification link during sign-up.
// Runs when Better Auth triggers sendVerificationEmail.
// Handles recipient, verification URL, and name; expected result is Resend send metadata.
export function sendVerificationLinkEmail(
  to: string,
  verificationUrl: string,
  firstName?: string | null,
) {
  return sendEmail({
    to,
    subject: "Verify your Spider Web account",
    react: VerificationEmailTemplate({
      firstName,
      verificationUrl,
    }),
  });
}

// Purpose:
// Sends the password reset link when the user requests a reset.
// Runs when Better Auth triggers sendResetPassword.
// Handles recipient, reset URL, and name; expected result is Resend send metadata.
export function sendPasswordResetLinkEmail(
  to: string,
  resetUrl: string,
  firstName?: string | null,
) {
  return sendEmail({
    to,
    subject: "Reset your Spider Web password",
    react: PasswordResetEmailTemplate({
      firstName,
      resetUrl,
    }),
  });
}

// Purpose:
// Confirms that a password change completed successfully.
// Runs after Better Auth finishes onPasswordReset.
// Handles recipient and name; expected result is Resend send metadata.
export function sendPasswordChangedConfirmationEmail(
  to: string,
  firstName?: string | null,
) {
  const name = firstName?.trim() || "there";

  return sendEmail({
    to,
    subject: "Your Spider Web password was changed",
    react: GenericEmailTemplate({
      title: "Password changed successfully",
      message: `Hey ${name}, your password changed successfully.`,
      footer:
        "If you did not make this change, reset your password immediately and review your account activity.",
    }),
  });
}

// Purpose:
// Sends a generic test email using the shared template.
// Runs from dev/admin tooling or manual tests.
// Handles recipient(s) and optional copy; expected result is Resend send metadata.
export function sendGenericTestEmail(
  to: string | string[],
  input: {
    title?: string;
    message?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    footer?: string;
  } = {},
) {
  return sendEmail({
    to,
    subject: input.title ?? "Spider Web test email",
    react: GenericEmailTemplate({
      title: input.title ?? "Spider Web test email",
      message:
        input.message ??
        "This is a generic email template you can reuse for future product emails.",
      ctaLabel: input.ctaLabel,
      ctaUrl: input.ctaUrl,
      footer: input.footer,
    }),
  });
}
