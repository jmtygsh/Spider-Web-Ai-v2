import { createAuthClient } from "better-auth/react";

import { env } from "@/env";

// Purpose:
// Browser-side Better Auth client for sign-in, sign-up, and session hooks.
// Runs in client components; created once at module load.
// Expected result: authClient with useSession and social/credential methods.
export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_API_BASE_URL,
});

export type Session = typeof authClient.$Infer.Session;



