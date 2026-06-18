import type { NormalizedIntegrationEvent } from "@/features/event-ingestion";
import { WORKFLOW_INTEGRATION_EVENT } from "@/features/workflow/config/workflow";
import type { WorkflowIntegrationEventData } from "@/features/workflow/types/workflow";
import { inngest } from "@/server/configs/inngest";

export async function enqueueNormalizedIntegrationEvent(input: {
  event: NormalizedIntegrationEvent;
}) {
  // Problem:
  // the webhook path was only persisting events, so the product stayed passive.
  // Why this choice:
  // send one durable workflow event here and let Inngest own async fan-out,
  // retries, and scheduling outside the request lifecycle.
  return await inngest.send({
    id: input.event.id,
    name: WORKFLOW_INTEGRATION_EVENT,
    data: {
      normalizedEventId: input.event.id,
      accountId: input.event.accountId,
      tenantId: input.event.tenantId,
      provider: input.event.provider,
      eventType: input.event.eventType,
      occurredAt: input.event.occurredAt,
      signal: input.event.signal,
    } satisfies WorkflowIntegrationEventData,
  });
}
