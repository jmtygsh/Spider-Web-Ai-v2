import { upsertSafetyPolicyEntity } from "@/features/safety-policy/logic/upsert-safety-policy-entity";
import type {
  ApprovalRequest,
  RequireHumanApprovalInput,
} from "@/features/safety-policy/types/safety-policy";

export async function requireHumanApproval(
  input: RequireHumanApprovalInput,
): Promise<ApprovalRequest> {
  const confidence = input.confidence ?? 1;
  const ambiguityScore = input.ambiguityScore ?? 0;

  const state =
    input.riskDecision === "deny"
      ? "denied"
      : input.riskDecision === "allow" &&
          confidence >= 0.85 &&
          ambiguityScore < 0.35
        ? "auto-approved"
        : "pending-human";

  const approval: ApprovalRequest = {
    id: `${input.accountId}:approval:${input.relatedStepId ?? input.title.toLowerCase().replace(/\s+/g, "-")}`,
    accountId: input.accountId,
    entityType: "approval_request",
    state,
    title: input.title,
    reason:
      state === "auto-approved"
        ? `Auto-approved: ${input.reason}`
        : state === "denied"
          ? `Denied: ${input.reason}`
          : input.reason,
    relatedStepId: input.relatedStepId ?? null,
    relatedThreadId: input.relatedThreadId ?? null,
    relatedMeetingId: input.relatedMeetingId ?? null,
    expiresAt:
      state === "pending-human"
        ? new Date(Date.now() + 1000 * 60 * 30).toISOString()
        : null,
    version: `${state}:${Date.now()}`,
  };

  await upsertSafetyPolicyEntity({
    accountId: input.accountId,
    entityId: input.relatedStepId ?? approval.id,
    entityType: approval.entityType,
    version: approval.version,
    data: approval,
  });

  return approval;
}
