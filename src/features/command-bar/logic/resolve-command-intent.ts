import {
  classifyCommandIntentWithAi,
  mergeIntentResults,
} from "@/features/command-bar/logic/classify-command-intent-with-ai";
import { parseCommandIntent } from "@/features/command-bar/logic/parse-command-intent";
import type {
  ParseCommandIntentInput,
  ParsedCommandIntent,
} from "@/features/command-bar/types/command-bar";
import { logger } from "@/server/observability/logger";

const HEURISTIC_CONFIDENCE_THRESHOLD = 0.85;

/**
 * Two-stage intent pipeline:
 * 1. Zero-cost regex classifier (fast path)
 * 2. gpt-4o-mini when confidence is low or intent is unknown
 */
export async function resolveCommandIntent(
  input: ParseCommandIntentInput,
): Promise<ParsedCommandIntent> {
  const heuristic = parseCommandIntent(input);

  if (
    heuristic.confidence >= HEURISTIC_CONFIDENCE_THRESHOLD &&
    heuristic.intent !== "unknown"
  ) {
    return heuristic;
  }

  try {
    const ai = await classifyCommandIntentWithAi(input.command);
    if (ai) {
      return mergeIntentResults(heuristic, ai);
    }
  } catch (error) {
    logger.warn("AI intent classification failed; using heuristic result.", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return heuristic;
}
