import { env } from "@/env";

// Must match the "Authorized redirect URI" registered in Google Cloud Console
// exactly, and must be identical in the connect + callback routes.
export const REDIRECT_URI = `${env.APP_URL}/api/oauth/callback`;

// Shared webhook receiver base URL.
export const WEBHOOK_URI = `${env.APP_URL}/api/webhooks`;

// Purpose:
// Builds the per-tenant webhook URL that Google Calendar push notifications target.
// Called when registering calendar watch subscriptions after OAuth.
// Handles tenant id; expected result is a full webhook URL with tenantId query param.
export function buildWebhookUrl(tenantId: string): string {
    const url = new URL(WEBHOOK_URI);
    url.searchParams.set("tenantId", tenantId);
    return url.toString();
}
