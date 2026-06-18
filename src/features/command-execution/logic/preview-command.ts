import {
  buildCommandPreview,
  planCommandWithAi,
  resolveCommandEntities,
  resolveCommandIntent,
} from "@/features/command-bar";
import type {
  CommandPreviewResult,
  PreviewCommandInput,
} from "@/features/command-execution/types/command-execution";
import { checkPromptInjectionRisk } from "@/features/safety-policy";

export async function previewCommand(
  input: PreviewCommandInput,
): Promise<CommandPreviewResult> {
  const command = input.command.trim();
  const parsed = await resolveCommandIntent({ command });
  const resolved = input.accountId
    ? await resolveCommandEntities({
        accountId: input.accountId,
        parsed,
      })
    : {
        persons: [],
        meetings: [],
        threads: [],
        timeHints: parsed.args.timeHints,
      };
  let preview = buildCommandPreview({ parsed, resolved });

  if (parsed.intent !== "unknown" && parsed.confidence >= 0.7) {
    const aiPlan = await planCommandWithAi({ command, parsed, resolved });
    if (aiPlan) {
      preview = {
        ...preview,
        summary: aiPlan.summary,
        plannedSteps: aiPlan.steps,
      };
    }
  }

  const injection = input.accountId
    ? await checkPromptInjectionRisk({
        accountId: input.accountId,
        sourceType: "user_command",
        content: command,
      })
    : null;

  return {
    accountId: input.accountId,
    parsed,
    resolved,
    preview,
    injection: injection
      ? {
          decision: injection.decision,
          score: injection.score,
          reasons: injection.reasons,
        }
      : {
          decision: "low" as const,
          score: 0,
          reasons: ["Connect an integration to run safety checks."],
        },
  };
}
