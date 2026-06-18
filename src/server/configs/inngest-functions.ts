import { inngest } from "@/server/configs/inngest";
import {
  fanOutProjectionRefresh,
  refreshMeetingPrepWorkflow,
  refreshMeetingProjectionWorkflow,
  refreshRelationshipProfilesWorkflow,
  refreshThreadProjectionWorkflow,
  refreshTimelineWorkflow,
  runScheduledMeetingPrep,
} from "@/features/workflow";

// Purpose:
// Minimal demo function so the Inngest dev server can discover this app.
// Trigger it from the Inngest UI with the event name below.
export const inngestHealthcheck = inngest.createFunction(
  {
    id: "inngest-healthcheck",
    triggers: { event: "app/healthcheck.requested" },
  },
  async ({ event, step }) => {
    const payload = await step.run("collect-payload", async () => {
      return {
        ok: true,
        message: "Inngest is connected",
        receivedAt: new Date().toISOString(),
        input: event.data ?? null,
      };
    });

    return payload;
  },
);

export const inngestFunctions = [
  inngestHealthcheck,
  fanOutProjectionRefresh,
  refreshThreadProjectionWorkflow,
  refreshMeetingProjectionWorkflow,
  refreshMeetingPrepWorkflow,
  refreshRelationshipProfilesWorkflow,
  refreshTimelineWorkflow,
  runScheduledMeetingPrep,
];
