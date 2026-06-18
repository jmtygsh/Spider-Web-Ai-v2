import type { InboxTriageBucket } from "@/features/inbox-triage/types/inbox-triage";

const VALID_BUCKETS: InboxTriageBucket[] = [
  "action_required",
  "schedule",
  "fyi",
  "later",
];

export function parseTriageBucket(value: string): InboxTriageBucket | null {
  const normalized = value.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");

  if (VALID_BUCKETS.includes(normalized as InboxTriageBucket)) {
    return normalized as InboxTriageBucket;
  }

  if (normalized.includes("action") || normalized.includes("urgent")) {
    return "action_required";
  }

  if (normalized.includes("schedule") || normalized.includes("meeting")) {
    return "schedule";
  }

  if (normalized.includes("fyi") || normalized.includes("read")) {
    return "fyi";
  }

  if (normalized.includes("later") || normalized.includes("low")) {
    return "later";
  }

  return null;
}

export function isAiImportantBucket(bucket: InboxTriageBucket) {
  return bucket === "action_required" || bucket === "schedule";
}
