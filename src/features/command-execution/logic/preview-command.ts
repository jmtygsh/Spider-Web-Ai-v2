import {
  buildCommandPreview,
  parseCommandIntent,
  resolveCommandEntities,
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
  const parsed = parseCommandIntent({ command });
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
  const preview = buildCommandPreview({ parsed, resolved });

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
