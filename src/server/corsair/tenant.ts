import { getSession } from "@/server/better-auth/server";
import { corsair } from "@/server/configs/corsair";

export async function getCorsairTenant() {
  const session = await getSession();
  if (!session) return null;

  const tenantId = session.user.id;
  return { session, tenantId, tenant: corsair.withTenant(tenantId) };
}
