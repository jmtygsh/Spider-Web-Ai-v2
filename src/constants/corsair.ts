import type { IntegrationProvider } from "@/features/event-ingestion";
import { env } from "@/env";

// Must match the "Authorized redirect URI" registered in Google Cloud Console
// exactly, and must be identical in the connect + callback routes.
export const REDIRECT_URI = `${env.APP_URL}/api/oauth/callback`;

// Shared webhook receiver base URL.
export const WEBHOOK_URI = `${env.APP_URL}/api/webhooks`;

// Purpose:
// Builds the per-tenant webhook URL integrations target.
// Called when registering provider watches/subscriptions after OAuth.
// Handles tenant id and optional provider; expected result is a full webhook URL.
export function buildWebhookUrl(
  tenantId: string,
  provider?: IntegrationProvider,
): string {
  const url = new URL(WEBHOOK_URI);
  url.searchParams.set("tenantId", tenantId);
  if (provider) {
    url.searchParams.set("provider", provider);
  }
  return url.toString();
}
