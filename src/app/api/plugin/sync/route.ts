import { type NextRequest } from "next/server";
import {
  isWorkspaceAuthenticationError,
  requireAuthenticatedWorkspace,
} from "@/features/identity-workspace";
import { ok, serverError, unauthorized } from "@/server/http/response";

export async function GET(_req: NextRequest) {
  try {
    await requireAuthenticatedWorkspace();

    setTimeout(() => {
      console.log("Hello after 2 seconds!");
    }, 2000);

    return ok(true);
  } catch (error) {
    if (isWorkspaceAuthenticationError(error)) {
      return unauthorized("Unauthorized");
    }

    console.error("Connections sync failed:", error);
    return serverError("Connections sync failed");
  }
}
