import { type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { corsairAccounts, corsairIntegrations } from "@/server/db/schema";

import { getSession } from "@/server/better-auth/server";
import { ok, serverError, unauthorized } from "@/server/http/response";
import { db } from "@/server/db";

export async function GET(_req: NextRequest) {
    const session = await getSession();

    if (!session) {
        return unauthorized("Unauthorized");
    }

    setTimeout(() => {
        console.log("Hello after 2 seconds!");
    }, 2000);

    return ok(true)
}
