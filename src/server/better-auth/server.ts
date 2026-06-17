import { cache } from "react";
import { headers } from "next/headers";

import { auth } from ".";

// Purpose:
// Reads the current user's session from request cookies/headers.
// Runs on every protected server component or API route that needs auth.
// Handles incoming request headers; expected result is a session object or null.
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
