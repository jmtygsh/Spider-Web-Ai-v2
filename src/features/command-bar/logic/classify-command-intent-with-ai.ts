import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { env } from "@/env";
import type {
  CommandIntent,
  ParsedCommandIntent,
} from "@/features/command-bar/types/command-bar";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const INTENT_CLASSIFIER_MODEL = "gpt-4o-mini";

const aiIntentSchema = z.object({
  intent: z.enum([
    "create_meeting",
    "send_reply",
    "find_thread",
    "prepare_meeting",
    "unknown",
  ]),
  confidence: z.number().min(0).max(1),
  queryText: z.string().nullable(),
  participantHints: z.array(z.string()).max(8),
  timeHints: z.array(z.string()).max(8),
  reasoning: z.string(),
});

export type AiClassifiedIntent = z.infer<typeof aiIntentSchema>;

export async function classifyCommandIntentWithAi(
  command: string,
): Promise<AiClassifiedIntent | null> {
  if (!env.OPENAI_API_KEY || !command.trim()) {
    return null;
  }

  const response = await openai.responses.parse({
    model: INTENT_CLASSIFIER_MODEL,
    input: [
      {
        role: "system",
        content:
          "You classify natural-language workspace commands for an email+calendar assistant. Return structured JSON only. Supported intents: create_meeting, send_reply, find_thread, prepare_meeting, unknown. Extract participant emails, time hints, and a short queryText for search.",
      },
      {
        role: "user",
        content: command.trim(),
      },
    ],
    text: {
      format: zodTextFormat(aiIntentSchema, "command_intent"),
    },
  });

  return response.output_parsed ?? null;
}

export function mergeIntentResults(
  heuristic: ParsedCommandIntent,
  ai: AiClassifiedIntent,
): ParsedCommandIntent {
  const useAi =
    ai.confidence > heuristic.confidence ||
    (heuristic.intent === "unknown" && ai.intent !== "unknown");

  if (!useAi) {
    return heuristic;
  }

  return {
    ...heuristic,
    intent: ai.intent as CommandIntent,
    confidence: ai.confidence,
    args: {
      queryText: ai.queryText ?? heuristic.args.queryText,
      participantHints: Array.from(
        new Set([
          ...heuristic.args.participantHints,
          ...ai.participantHints,
        ]),
      ),
      timeHints: Array.from(
        new Set([...heuristic.args.timeHints, ...ai.timeHints]),
      ),
    },
  };
}
