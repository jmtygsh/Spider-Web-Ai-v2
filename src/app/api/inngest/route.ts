import { serve } from "inngest/next";

import { inngest } from "@/server/configs/inngest";
import { inngestFunctions } from "@/server/configs/inngest-functions";

export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
});
