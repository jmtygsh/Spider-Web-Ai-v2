import { upsertSafetyPolicyEntity } from "@/features/safety-policy/logic/upsert-safety-policy-entity";
import type {
  CheckPromptInjectionRiskInput,
  PromptInjectionAssessment,
} from "@/features/safety-policy/types/safety-policy";

const SUSPICIOUS_PATTERNS: Array<{
  label: string;
  regex: RegExp;
  score: number;
}> = [
  {
    label: "instruction_override_language",
    regex: /\b(ignore (all|previous|prior) instructions|override system|new instructions)\b/i,
    score: 0.32,
  },
  {
    label: "credential_or_secret_request",
    regex: /\b(password|api key|secret|token|bank account|social security|credit card)\b/i,
    score: 0.28,
  },
  {
    label: "exfiltration_or_forwarding_request",
    regex: /\b(send (it|them|this) to|forward to|upload to|submit to|export data|copy all)\b/i,
    score: 0.24,
  },
  {
    label: "urgent_pressure_language",
    regex: /\b(urgent|immediately|act now|right away|without review|do not tell|confidential)\b/i,
    score: 0.14,
  },
  {
    label: "suspicious_link_or_attachment_language",
    regex: /\b(click (this|the) link|download (the|this) attachment|open attached file)\b/i,
    score: 0.18,
  },
];

function clamp(value: number) {
  return Number(Math.max(0, Math.min(1, value)).toFixed(2));
}

export async function checkPromptInjectionRisk(
  input: CheckPromptInjectionRiskInput,
): Promise<PromptInjectionAssessment> {
  const suspiciousSignals: string[] = [];
  const reasons: string[] = [];
  let score = input.sourceType === "user_command" ? 0.08 : 0.2;

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.regex.test(input.content)) {
      suspiciousSignals.push(pattern.label);
      score += pattern.score;
    }
  }

  if (input.content.length > 3000) {
    score += 0.08;
    reasons.push("Large untrusted content can hide manipulative instructions.");
  }

  if (input.sourceType !== "user_command") {
    score += 0.08;
    reasons.push("External content is treated as less trusted than direct user commands.");
  } else {
    reasons.push("Direct user command has a higher base trust level than email content.");
  }

  if (suspiciousSignals.length > 0) {
    reasons.push(`Detected suspicious signals: ${suspiciousSignals.join(", ")}.`);
  }

  score = clamp(score);

  const decision =
    score >= 0.72 ? "high" : score >= 0.35 ? "medium" : "low";

  const assessment: PromptInjectionAssessment = {
    id: `${input.accountId}:prompt-injection:${input.sourceType}:${input.content.length}`,
    accountId: input.accountId,
    entityType: "prompt_injection_assessment",
    sourceType: input.sourceType,
    decision,
    score,
    reasons,
    suspiciousSignals,
    version: `${decision}:${score}:${Date.now()}`,
  };

  await upsertSafetyPolicyEntity({
    accountId: input.accountId,
    entityId: `${input.sourceType}:${input.content.length}`,
    entityType: assessment.entityType,
    version: assessment.version,
    data: assessment,
  });

  return assessment;
}
