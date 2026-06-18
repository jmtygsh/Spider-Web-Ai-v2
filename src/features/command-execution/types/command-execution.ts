import type { CommandPreview, ParsedCommandIntent, ResolvedCommandEntities } from "@/features/command-bar";
import type { ApprovalRequest } from "@/features/safety-policy";
import type { PromptInjectionAssessment } from "@/features/safety-policy/types/safety-policy";

export type CommandExecutionStepResult = {
  stepId: string;
  action: string;
  status: "succeeded" | "failed" | "blocked" | "pending";
  verified: boolean;
  message: string;
  output: Record<string, unknown> | null;
  error: string | null;
};

export type CommandPreviewResult = {
  accountId: string | null;
  parsed: ParsedCommandIntent;
  resolved: ResolvedCommandEntities;
  preview: CommandPreview;
  injection: Pick<PromptInjectionAssessment, "decision" | "score" | "reasons">;
};

export type CommandExecutionResult = {
  runId: string;
  mode: "deterministic" | "mcp";
  status: "completed" | "approval_required" | "blocked" | "failed";
  preview: CommandPreview;
  parsed: ParsedCommandIntent;
  planId?: string;
  approval?: ApprovalRequest;
  steps?: CommandExecutionStepResult[];
  message: string;
};

export type PreviewCommandInput = {
  command: string;
  accountId: string | null;
};

export type ExecuteCommandInput = {
  command: string;
  accountId: string | null;
  tenantId: string;
  cookieHeader: string | null;
  forceExecute?: boolean;
};
