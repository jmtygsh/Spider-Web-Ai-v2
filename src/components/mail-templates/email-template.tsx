import type { ReactNode } from "react";

import { getDisplayName } from "@/utils/helper";

type BaseEmailTemplateProps = {
  preheader: string;
  title: string;
  intro: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footer?: string;
  children?: ReactNode;
};

type NamedTemplateProps = {
  firstName?: string | null;
  appName?: string;
};

type VerificationEmailTemplateProps = NamedTemplateProps & {
  verificationUrl: string;
};

type PasswordResetEmailTemplateProps = NamedTemplateProps & {
  resetUrl: string;
};

type WelcomeEmailTemplateProps = NamedTemplateProps & {
  dashboardUrl?: string;
};

type GenericEmailTemplateProps = {
  title: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footer?: string;
};

// Purpose:
// Shared HTML layout for all transactional emails.
// Used internally by welcome, verification, reset, and generic templates.
// Renders branded header, body text, optional CTA button, and footer.
function BaseEmailTemplate({
  preheader,
  title,
  intro,
  body,
  ctaLabel,
  ctaUrl,
  footer,
  children,
}: BaseEmailTemplateProps) {
  // Shared HTML layout — header gradient, body copy, optional CTA, and footer.
  return (
    <div
      style={{
        margin: 0,
        padding: "24px 0",
        backgroundColor: "#f4f7fb",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#111827",
      }}
    >
      <div
        style={{
          display: "none",
          maxHeight: 0,
          overflow: "hidden",
          opacity: 0,
        }}
      >
        {preheader}
      </div>

      <div
        style={{
          maxWidth: "560px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid #e5e7eb",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #2563eb, #4f46e5)",
            padding: "28px 32px",
            color: "#ffffff",
          }}
        >
          <p style={{ margin: 0, fontSize: "13px", opacity: 0.88 }}>
            Spider Web
          </p>
          <h1 style={{ margin: "8px 0 0", fontSize: "28px", lineHeight: 1.2 }}>
            {title}
          </h1>
        </div>

        <div style={{ padding: "32px" }}>
          <p style={{ margin: "0 0 16px", fontSize: "16px", lineHeight: 1.7 }}>
            {intro}
          </p>
          <p
            style={{
              margin: "0 0 24px",
              fontSize: "15px",
              lineHeight: 1.7,
              color: "#374151",
            }}
          >
            {body}
          </p>

          {ctaLabel && ctaUrl ? (
            <a
              href={ctaUrl}
              style={{
                display: "inline-block",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                padding: "12px 18px",
                borderRadius: "10px",
                textDecoration: "none",
                fontWeight: 700,
                marginBottom: "24px",
              }}
            >
              {ctaLabel}
            </a>
          ) : null}

          {children}

          <div
            style={{
              marginTop: "24px",
              paddingTop: "20px",
              borderTop: "1px solid #e5e7eb",
              fontSize: "13px",
              lineHeight: 1.6,
              color: "#6b7280",
            }}
          >
            <p style={{ margin: 0 }}>
              {footer ??
                "If you did not expect this email, you can safely ignore it."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Purpose:
// Welcome email sent after a new user completes signup.
// Runs when Better Auth triggers the welcome/verification flow.
// Includes an optional link to open the dashboard.
export function WelcomeEmailTemplate({
  firstName,
  appName = "Spider Web",
  dashboardUrl,
}: WelcomeEmailTemplateProps) {
  const name = getDisplayName(firstName);

  return (
    <BaseEmailTemplate
      preheader={`Welcome to ${appName}`}
      title={`Welcome to ${appName}`}
      intro={`Hi ${name},`}
      body={`Your account is ready. You can now connect Gmail and Google Calendar, then manage them from one AI-native workspace.`}
      ctaLabel={dashboardUrl ? "Open dashboard" : undefined}
      ctaUrl={dashboardUrl}
      footer={`Thanks for joining ${appName}.`}
    />
  );
}

// Purpose:
// Email verification message with a confirm-email link.
// Runs when a user signs up and must verify their address.
// Expected result: user clicks the link and account becomes verified.
export function VerificationEmailTemplate({
  firstName,
  appName = "Spider Web",
  verificationUrl,
}: VerificationEmailTemplateProps) {
  const name = getDisplayName(firstName);

  return (
    <BaseEmailTemplate
      preheader={`Verify your email for ${appName}`}
      title="Verify your email"
      intro={`Hi ${name},`}
      body={`Please confirm your email address to finish setting up your ${appName} account.`}
      ctaLabel="Verify email"
      ctaUrl={verificationUrl}
      footer="This verification link will expire automatically."
    >
      <p
        style={{
          margin: 0,
          fontSize: "13px",
          lineHeight: 1.6,
          color: "#6b7280",
        }}
      >
        If the button does not work, copy and paste this URL into your browser:
        <br />
        <a
          href={verificationUrl}
          style={{ color: "#2563eb", wordBreak: "break-all" }}
        >
          {verificationUrl}
        </a>
      </p>
    </BaseEmailTemplate>
  );
}

// Purpose:
// Password reset email with a one-time reset link.
// Runs when the user requests a forgot-password reset.
// Expected result: user clicks the link and sets a new password.
export function PasswordResetEmailTemplate({
  firstName,
  appName = "Spider Web",
  resetUrl,
}: PasswordResetEmailTemplateProps) {
  const name = (firstName);

  return (
    <BaseEmailTemplate
      preheader={`Reset your ${appName} password`}
      title="Reset your password"
      intro={`Hi ${name},`}
      body={`We received a request to reset your ${appName} password. Use the button below to choose a new one.`}
      ctaLabel="Reset password"
      ctaUrl={resetUrl}
      footer="If you did not request a password reset, you can ignore this email."
    >
      <p
        style={{
          margin: 0,
          fontSize: "13px",
          lineHeight: 1.6,
          color: "#6b7280",
        }}
      >
        If the button does not work, copy and paste this URL into your browser:
        <br />
        <a href={resetUrl} style={{ color: "#2563eb", wordBreak: "break-all" }}>
          {resetUrl}
        </a>
      </p>
    </BaseEmailTemplate>
  );
}

// Purpose:
// Flexible transactional email for one-off server notifications.
// Runs when the app needs to send a custom message without a dedicated template.
// Accepts title, message body, and optional CTA link.
export function GenericEmailTemplate({
  title,
  message,
  ctaLabel,
  ctaUrl,
  footer,
}: GenericEmailTemplateProps) {
  return (
    <BaseEmailTemplate
      preheader={title}
      title={title}
      intro="Hello,"
      body={message}
      ctaLabel={ctaLabel}
      ctaUrl={ctaUrl}
      footer={footer}
    />
  );
}
