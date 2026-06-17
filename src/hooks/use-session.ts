"use client";

import { authClient } from "@/server/better-auth/client";

// Purpose:
// Thin wrapper around Better Auth's session hook for client components.
// Runs when any client component needs the logged-in user or auth actions.
// Returns session data, loading state, and sign-in/sign-out helpers from authClient.
export function useSession() {
  return authClient.useSession();
}
