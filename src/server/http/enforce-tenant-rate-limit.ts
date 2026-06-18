import type { RateLimitOptions } from "@/server/http/rate-limit";
import { checkRateLimit } from "@/server/http/rate-limit";

export async function enforceTenantRateLimit(
  tenantId: string,
  scope: string,
  opts: RateLimitOptions,
) {
  return checkRateLimit(`${scope}:${tenantId}`, opts);
}
