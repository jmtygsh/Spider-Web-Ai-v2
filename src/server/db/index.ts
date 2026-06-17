import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/env";

import * as schema from "./schema";

// Purpose:
// Reuse a single Postgres connection in development to avoid HMR connection leaks.
// Runs at module load; caches conn on globalThis when NODE_ENV is not production.
// Expected result: shared postgres.Sql connection reused across hot reloads.
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

export const conn = globalForDb.conn ?? postgres(env.DATABASE_URL);
if (env.NODE_ENV !== "production") globalForDb.conn = conn;

// Purpose:
// Drizzle ORM wrapper — all app queries go through this instance with schema types.
// Runs at module load; used by every server module that reads or writes Postgres.
// Expected result: typed db client bound to postgres conn and ./schema.
export const db = drizzle(conn, { schema });
