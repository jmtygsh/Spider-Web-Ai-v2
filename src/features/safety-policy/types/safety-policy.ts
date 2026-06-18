import type { ExecutionPlanStep } from "@/features/execution";

export type SafetyPolicyEntityType =
  | "tool_risk_assessment"
  | "prompt_injection_assessment"
  | "approval_request";

export type ToolRiskDecision = "allow" | "ask-human" | "deny";

export type ToolRiskAssessment = {
  id: string;
  accountId: string;
  entityType: "tool_risk_assessment";
  stepId: string | null;
  decision: ToolRiskDecision;
  riskScore: number;
  reasons: string[];
  version: string;
};

export type PromptInjectionDecision = "low" | "medium" | "high";

export type PromptInjectionAssessment = {
  id: string;
  accountId: string;
  entityType: "prompt_injection_assessment";
  sourceType: "user_command" | "email_content" | "meeting_content";
  decision: PromptInjectionDecision;
  score: number;
  reasons: string[];
  suspiciousSignals: string[];
  version: string;
};

export type ApprovalState =
  | "auto-approved"
  | "pending-human"
  | "approved"
  | "denied";

export type ApprovalRequest = {
  id: string;
  accountId: string;
  entityType: "approval_request";
  state: ApprovalState;
  title: string;
  reason: string;
  relatedStepId: string | null;
  relatedThreadId: string | null;
  relatedMeetingId: string | null;
  expiresAt: string | null;
  version: string;
};

export type EvaluateToolRiskInput = {
  accountId: string;
  step: ExecutionPlanStep;
  confidence?: number | null;
  relatedThreadId?: string | null;
  relatedMeetingId?: string | null;
};

export type CheckPromptInjectionRiskInput = {
  accountId: string;
  sourceType: PromptInjectionAssessment["sourceType"];
  content: string;
};

export type RequireHumanApprovalInput = {
  accountId: string;
  title: string;
  reason: string;
  riskDecision: ToolRiskDecision;
  confidence?: number | null;
  ambiguityScore?: number | null;
  relatedStepId?: string | null;
  relatedThreadId?: string | null;
  relatedMeetingId?: string | null;
};
