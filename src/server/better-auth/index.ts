// Purpose:
// Re-exports the configured Better Auth instance for server-side use.
// Imported by API routes and server actions that need session validation.
// Expected result: `auth` object from ./config.
export { auth } from "./config";
