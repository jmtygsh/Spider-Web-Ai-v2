import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { env } from "@/env";
import type { ParsedCommandIntent } from "@/features/command-bar/types/command-bar";
import type { ResolvedCommandEntities } from "@/features/command-bar/types/command-bar";
import { logger } from "@/server/observability/logger";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const PLANNER_MODEL = "gpt-4o-2024-08-06";

const aiPlanSchema = z.object({
  summary: z.string(),
  steps: z.array(z.string()).min(1).max(6),
});

export type AiExecutionPlan = z.infer<typeof aiPlanSchema>;

/**
 * Planner model for multi-step or ambiguous commands.
 * Used when deterministic plan steps are empty but intent is known.
 */
export async function planCommandWithAi(input: {
  command: string;
  parsed: ParsedCommandIntent;
  resolved: ResolvedCommandEntities;
}): Promise<AiExecutionPlan | null> {
  if (!env.OPENAI_API_KEY) {
    return null;
  }

  try {
    const response = await openai.responses.parse({
      model: PLANNER_MODEL,
      input: [
        {
          role: "system",
          content:
            "You are an execution planner for a Gmail+Calendar workspace assistant. Given a user command and resolved entities, produce a short ordered plan of concrete actions. Do not invent data not in context.",
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              command: input.command,
              intent: input.parsed.intent,
              confidence: input.parsed.confidence,
              resolved: {
                persons: input.resolved.persons.slice(0, 5),
                meetings: input.resolved.meetings.slice(0, 3).map((entry) => ({
                  title: entry.meeting.title,
                  startAt: entry.meeting.startAt,
                })),
                threads: input.resolved.threads.slice(0, 3).map((entry) => ({
                  subject: entry.thread.subject,
                  snippet: entry.thread.snippet,
                })),
              },
            },
            null,
            2,
          ),
        },
      ],
      text: {
        format: zodTextFormat(aiPlanSchema, "execution_plan"),
      },
    });

    return response.output_parsed ?? null;
  } catch (error) {
    logger.warn("AI execution planning failed.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
