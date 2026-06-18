// import 'dotenv/config';
import { gmail } from "@corsair-dev/gmail";
import { googlecalendar } from "@corsair-dev/googlecalendar";
import { createCorsair } from "corsair";

import { conn } from "@/server/db/index";
import { env } from "@/env";

const plugins = [
  gmail({
    authType: "oauth_2",
    webhookHooks: {
      messageChanged: {
        after: async (_ctx) => {
          // await markWebhookReceived(ctx.tenantId, "gmail");
        },
      },
    },
  }),
  googlecalendar({
    authType: "oauth_2",
    webhookHooks: {
      onEventChanged: {
        after: async (_ctx) => {
          // await markWebhookReceived(ctx.tenantId, "googlecalendar");
        },
      },
    },
  }),
  // outlook({
  //   authType: "oauth_2",
  // }),
  // tavily({
  //   authType: "api_key",
  // }),
];

// Shared multi-tenant Corsair client — Gmail + Google Calendar with webhook hooks.
export const corsair = createCorsair({
  multiTenancy: true,
  database: conn,
  kek: env.CORSAIR_KEK!,
  plugins,
});

/** Corsair client scoped to a single tenant (what `corsair.withTenant` returns). */
export type CorsairTenant = ReturnType<typeof corsair.withTenant>;
