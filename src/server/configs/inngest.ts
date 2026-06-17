import { Inngest } from "inngest";

// Purpose:
// Shared Inngest client for sending events and registering background workers.
// Runs at module load on the server; used by API routes and Inngest functions.
// Expected result: configured Inngest instance with app id "spider-web".
export const inngest = new Inngest({
    id: "spider-web",
});
