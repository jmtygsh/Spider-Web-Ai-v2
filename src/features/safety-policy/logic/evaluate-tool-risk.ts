import { upsertSafetyPolicyEntity } from "@/features/safety-policy/logic/upsert-safety-policy-entity";
import type {
  EvaluateToolRiskInput,
  ToolRiskAssessment,
} from "@/features/safety-policy/types/safety-policy";

function clamp(value: number) {
  return Number(Math.max(0, Math.min(1, value)).toFixed(2));
}

export async function evaluateToolRisk(
  input: EvaluateToolRiskInput,
): Promise<ToolRiskAssessment> {
  const reasons: string[] = [];
  let riskScore = 0.2;

  switch (input.step.action) {
    case "find_gmail_thread":
    case "generate_meeting_prep":
      riskScore += 0.05;
      reasons.push("Action is read-oriented or internal-only.");
      break;
    case "create_calendar_event":
      riskScore += 0.5;
      reasons.push("Calendar writes can create external side effects.");
      break;
    case "send_gmail_reply":
      riskScore += 0.6;
      reasons.push("Email send actions contact external recipients.");
      break;
    default:
      riskScore += 0.35;
      reasons.push("Action risk is not yet explicitly categorized.");
      break;
  }

  if ((input.confidence ?? 1) < 0.75) {
    riskScore += 0.15;
    reasons.push("Execution confidence is below the safe auto-run threshold.");
  }

  if (
    input.step.action === "send_gmail_reply" &&
    !input.relatedThreadId
  ) {
    riskScore += 0.2;
    reasons.push("Reply send is not grounded to a specific thread.");
  }

  if (
    input.step.action === "create_calendar_event" &&
    !input.relatedMeetingId &&
    !(Array.isArray(input.step.payload.attendees) && input.step.payload.attendees.length > 0)
  ) {
    riskScore += 0.2;
    reasons.push("Meeting creation lacks clear grounded participants or meeting context.");
  }

  riskScore = clamp(riskScore);

  const decision =
    riskScore >= 0.9
      ? "deny"
      : riskScore >= 0.45
        ? "ask-human"
        : "allow";

  const assessment: ToolRiskAssessment = {
    id: `${input.accountId}:tool-risk:${input.step.id}`,
    accountId: input.accountId,
    entityType: "tool_risk_assessment",
    stepId: input.step.id,
    decision,
    riskScore,
    reasons,
    version: `${decision}:${riskScore}:${Date.now()}`,
  };

  await upsertSafetyPolicyEntity({
    accountId: input.accountId,
    entityId: input.step.id,
    entityType: assessment.entityType,
    version: assessment.version,
    data: assessment,
  });

  return assessment;
}
