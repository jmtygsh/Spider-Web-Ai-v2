import { serve } from "inngest/next";

import { inngest } from "@/server/configs/inngest";
import { inngestHealthcheck } from "@/server/configs/inngest-functions";

export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [inngestHealthcheck],
});
