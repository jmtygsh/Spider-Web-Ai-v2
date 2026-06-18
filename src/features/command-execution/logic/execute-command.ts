import {
  executeToolStep,
  planExecutionSteps,
  verifyToolResult,
  writeExecutionLog,
} from "@/features/execution";
import {
  evaluateToolRisk,
  requireHumanApproval,
} from "@/features/safety-policy";
import { previewCommand } from "@/features/command-execution/logic/preview-command";
import { executeCommandWithMcp } from "@/features/command-execution/logic/execute-command-with-mcp";
import type {
  CommandExecutionResult,
  CommandExecutionStepResult,
  ExecuteCommandInput,
} from "@/features/command-execution/types/command-execution";

function relatedThreadId(
  parsedIntent: Awaited<ReturnType<typeof previewCommand>>["parsed"],
  resolved: Awaited<ReturnType<typeof previewCommand>>["resolved"],
) {
  if (parsedIntent.intent !== "send_reply") {
    return null;
  }

  return resolved.threads[0]?.thread.externalThreadId ?? null;
}

function relatedMeetingId(
  parsedIntent: Awaited<ReturnType<typeof previewCommand>>["parsed"],
  resolved: Awaited<ReturnType<typeof previewCommand>>["resolved"],
) {
  if (
    parsedIntent.intent === "prepare_meeting" ||
    parsedIntent.intent === "create_meeting"
  ) {
    return resolved.meetings[0]?.meeting.externalMeetingId ?? null;
  }

  return null;
}

export async function executeCommand(
  input: ExecuteCommandInput,
): Promise<CommandExecutionResult> {
  const command = input.command.trim();
  const runId = crypto.randomUUID();

  if (!input.accountId) {
    return {
      runId,
      mode: "deterministic",
      status: "failed",
      preview: {
        title: "Connect integrations",
        summary: "Connect Gmail or Google Calendar before running commands.",
        plannedSteps: [],
        resolvedSummary: [],
        safeToExecute: false,
      },
      parsed: parseFallbackIntent(command),
      message: "No connected integration account is available for this workspace.",
    };
  }

  const previewResult = await previewCommand({
    command,
    accountId: input.accountId,
  });

  if (previewResult.injection.decision === "high") {
    return {
      runId,
      mode: "deterministic",
      status: "blocked",
      preview: previewResult.preview,
      parsed: previewResult.parsed,
      message:
        "Command blocked by safety policy due to high prompt-injection risk.",
    };
  }

  const shouldUseMcp =
    previewResult.parsed.intent === "unknown" || !previewResult.preview.safeToExecute;

  if (shouldUseMcp) {
    try {
      const mcpResult = await executeCommandWithMcp({
        command,
        cookieHeader: input.cookieHeader,
        accountId: input.accountId,
        tenantId: input.tenantId,
        runId,
      });

      return {
        runId,
        mode: "mcp",
        status: "completed",
        preview: previewResult.preview,
        parsed: previewResult.parsed,
        message: mcpResult.text,
        steps: mcpResult.toolCalls.map((toolCall) => ({
          stepId: toolCall.toolCallId,
          action: toolCall.toolName,
          status: "succeeded" as const,
          verified: true,
          message: `MCP tool ${toolCall.toolName} completed.`,
          output: null,
          error: null,
        })),
      };
    } catch (error) {
      return {
        runId,
        mode: "mcp",
        status: "failed",
        preview: previewResult.preview,
        parsed: previewResult.parsed,
        message:
          error instanceof Error
            ? error.message
            : "MCP command execution failed.",
      };
    }
  }

  const plan = await planExecutionSteps({
    accountId: input.accountId,
    parsed: previewResult.parsed,
    resolved: previewResult.resolved,
  });

  if (plan.steps.length === 0) {
    return {
      runId,
      mode: "deterministic",
      status: "failed",
      preview: previewResult.preview,
      parsed: previewResult.parsed,
      planId: plan.id,
      message: "No executable steps were generated for this command.",
    };
  }

  const stepResults: CommandExecutionStepResult[] = [];

  for (const step of plan.steps) {
    const risk = await evaluateToolRisk({
      accountId: input.accountId,
      step,
      confidence: previewResult.parsed.confidence,
      relatedThreadId: relatedThreadId(previewResult.parsed, previewResult.resolved),
      relatedMeetingId: relatedMeetingId(previewResult.parsed, previewResult.resolved),
    });

    const approval = await requireHumanApproval({
      accountId: input.accountId,
      title: previewResult.preview.title,
      reason: risk.reasons.join(" "),
      riskDecision: risk.decision,
      confidence: previewResult.parsed.confidence,
      ambiguityScore: previewResult.parsed.intent === "unknown" ? 1 : 0.1,
      relatedStepId: step.id,
      relatedThreadId: relatedThreadId(previewResult.parsed, previewResult.resolved),
      relatedMeetingId: relatedMeetingId(previewResult.parsed, previewResult.resolved),
    });

    if (approval.state === "denied") {
      stepResults.push({
        stepId: step.id,
        action: step.action,
        status: "blocked",
        verified: false,
        message: approval.reason,
        output: null,
        error: approval.reason,
      });
      continue;
    }

    if (approval.state === "pending-human" && !input.forceExecute) {
      return {
        runId,
        mode: "deterministic",
        status: "approval_required",
        preview: previewResult.preview,
        parsed: previewResult.parsed,
        planId: plan.id,
        approval,
        steps: stepResults,
        message: approval.reason,
      };
    }

    const result = await executeToolStep({
      accountId: input.accountId,
      step,
    });
    const verification = await verifyToolResult({
      accountId: input.accountId,
      step,
      result,
    });

    await writeExecutionLog({
      accountId: input.accountId,
      runId,
      stepId: step.id,
      status: result.status === "succeeded" ? "succeeded" : "failed",
      message: `${step.description} (${verification.reason})`,
      detail: {
        source: "command-palette",
        action: step.action,
        output: result.output,
        error: result.error,
        verified: verification.verified,
      },
    });

    stepResults.push({
      stepId: step.id,
      action: step.action,
      status: result.status === "succeeded" ? "succeeded" : "failed",
      verified: verification.verified,
      message: verification.reason,
      output: result.output,
      error: result.error,
    });
  }

  const failedStep = stepResults.find((step) => step.status !== "succeeded");

  return {
    runId,
    mode: "deterministic",
    status: failedStep ? "failed" : "completed",
    preview: previewResult.preview,
    parsed: previewResult.parsed,
    planId: plan.id,
    steps: stepResults,
    message: failedStep
      ? (failedStep.error ?? failedStep.message)
      : "Command completed successfully.",
  };
}

function parseFallbackIntent(command: string) {
  return {
    raw: command,
    normalized: command.toLowerCase().trim(),
    intent: "unknown" as const,
    confidence: 0,
    args: {
      queryText: command,
      participantHints: [],
      timeHints: [],
    },
  };
}
