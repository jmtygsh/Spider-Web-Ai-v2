import type {
  ParsedCommandIntent,
  ResolvedCommandEntities,
} from "@/features/command-bar";

export type ExecutionEntityType = "execution_plan" | "execution_log";

export type ExecutionStepAction =
  | "create_calendar_event"
  | "send_gmail_reply"
  | "find_gmail_thread"
  | "generate_meeting_prep";

export type ExecutionStepStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed";

export type ExecutionVerificationMode =
  | "calendar_event_created"
  | "gmail_reply_sent"
  | "thread_found"
  | "meeting_prep_generated"
  | "none";

export type ExecutionPlanStep = {
  id: string;
  order: number;
  action: ExecutionStepAction;
  plugin: "googlecalendar" | "gmail" | "internal";
  operation: string;
  description: string;
  payload: Record<string, unknown>;
  verification: {
    mode: ExecutionVerificationMode;
  };
};

export type ExecutionPlan = {
  id: string;
  accountId: string;
  entityType: "execution_plan";
  intent: ParsedCommandIntent["intent"];
  targetSummary: string;
  steps: ExecutionPlanStep[];
  version: string;
};

export type PlanExecutionStepsInput = {
  accountId: string;
  parsed: ParsedCommandIntent;
  resolved: ResolvedCommandEntities;
};

export type ToolStepResult = {
  stepId: string;
  status: ExecutionStepStatus;
  output: Record<string, unknown> | null;
  error: string | null;
};

export type ExecuteToolStepInput = {
  accountId: string;
  step: ExecutionPlanStep;
};

export type VerificationResult = {
  stepId: string;
  verified: boolean;
  reason: string;
};

export type VerifyToolResultInput = {
  accountId: string;
  step: ExecutionPlanStep;
  result: ToolStepResult;
};

export type ExecutionLogEntry = {
  id: string;
  accountId: string;
  entityType: "execution_log";
  runId: string;
  stepId: string | null;
  status: ExecutionStepStatus | "verified" | "unverified";
  message: string;
  detail: Record<string, unknown>;
  createdAt: string;
};

export type WriteExecutionLogInput = {
  accountId: string;
  runId: string;
  stepId?: string | null;
  status: ExecutionLogEntry["status"];
  message: string;
  detail?: Record<string, unknown>;
};
