import { createWorkspaceCorsairClient } from "@/features/integration-access/logic/create-workspace-corsair-client";
import type {
  CalendarEventResource,
  GmailThreadResource,
} from "@/features/projection-sync";

type CorsairPluginId = "gmail" | "googlecalendar";
type CorsairDynamicClient = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function getPluginApiAction(
  client: CorsairDynamicClient,
  plugin: CorsairPluginId,
  resource: string,
  action: string,
) {
  const pluginSurface = asRecord(client[plugin]);
  const api = asRecord(pluginSurface?.api);
  const resourceSurface = asRecord(api?.[resource]);
  const fn = resourceSurface?.[action];

  return typeof fn === "function"
    ? (fn as (payload: Record<string, unknown>) => Promise<unknown>)
    : null;
}

export async function callCorsairPluginApi(input: {
  accountId: string;
  plugin: CorsairPluginId;
  resource: string;
  action: string;
  payload?: Record<string, unknown>;
}): Promise<unknown> {
  const client = (await createWorkspaceCorsairClient({
    accountId: input.accountId,
  })) as unknown as CorsairDynamicClient;
  const action = getPluginApiAction(
    client,
    input.plugin,
    input.resource,
    input.action,
  );

  if (!action) {
    throw new Error(
      `Corsair API ${input.plugin}.api.${input.resource}.${input.action} is not available.`,
    );
  }

  return action(input.payload ?? {});
}

export async function getGmailThreadResource(
  accountId: string,
  threadId: string,
): Promise<GmailThreadResource | null> {
  const result = await callCorsairPluginApi({
    accountId,
    plugin: "gmail",
    resource: "threads",
    action: "get",
    payload: {
      id: threadId,
      format: "full",
    },
  });

  const record = asRecord(result);
  if (!record || typeof record.id !== "string") {
    return null;
  }

  return record as GmailThreadResource;
}

export async function listGmailThreadResources(input: {
  accountId: string;
  maxResults?: number;
  query?: string;
}): Promise<GmailThreadResource[]> {
  const listResult = asRecord(
    await callCorsairPluginApi({
      accountId: input.accountId,
      plugin: "gmail",
      resource: "threads",
      action: "list",
      payload: {
        maxResults: input.maxResults ?? 20,
        ...(input.query ? { q: input.query } : {}),
      },
    }),
  );
  const threadIds = (Array.isArray(listResult?.threads) ? listResult.threads : [])
    .map((thread) => asRecord(thread)?.id)
    .filter((threadId): threadId is string => typeof threadId === "string" && !!threadId.trim());

  const threads: GmailThreadResource[] = [];
  for (const threadId of threadIds) {
    const thread = await getGmailThreadResource(input.accountId, threadId);
    if (thread) {
      threads.push(thread);
    }
  }

  return threads;
}

export async function getCalendarEventResource(input: {
  accountId: string;
  meetingId: string;
  calendarId?: string | null;
}): Promise<CalendarEventResource | null> {
  const result = await callCorsairPluginApi({
    accountId: input.accountId,
    plugin: "googlecalendar",
    resource: "events",
    action: "get",
    payload: {
      id: input.meetingId,
      calendarId: input.calendarId?.trim() || "primary",
    },
  });

  const record = asRecord(result);
  if (!record || typeof record.id !== "string") {
    return null;
  }

  return record as CalendarEventResource;
}

export async function listCalendarEventResources(input: {
  accountId: string;
  calendarId?: string;
  maxResults?: number;
  timeMin?: string;
}): Promise<CalendarEventResource[]> {
  const result = asRecord(
    await callCorsairPluginApi({
      accountId: input.accountId,
      plugin: "googlecalendar",
      resource: "events",
      action: "getMany",
      payload: {
        calendarId: input.calendarId ?? "primary",
        maxResults: input.maxResults ?? 20,
        singleEvents: true,
        ...(input.timeMin ? { timeMin: input.timeMin } : {}),
      },
    }),
  );

  const items = Array.isArray(result?.items) ? result.items : [];
  return items
    .map((item) => asRecord(item))
    .filter((item): item is CalendarEventResource => !!item && typeof item.id === "string");
}

const legacyExecutionOperations: Record<
  string,
  { plugin: CorsairPluginId; resource: string; action: string }
> = {
  "gmail:findThread": { plugin: "gmail", resource: "threads", action: "list" },
  "gmail:sendReply": { plugin: "gmail", resource: "messages", action: "send" },
  "googlecalendar:createEvent": {
    plugin: "googlecalendar",
    resource: "events",
    action: "create",
  },
};

export async function callCorsairExecutionOperation(input: {
  accountId: string;
  plugin: string;
  operation: string;
  payload: Record<string, unknown>;
}): Promise<unknown> {
  const legacyKey = `${input.plugin}:${input.operation}`;
  const mapped = legacyExecutionOperations[legacyKey];

  if (mapped) {
    if (legacyKey === "gmail:findThread") {
      const query =
        typeof input.payload.query === "string" ? input.payload.query.trim() : "";
      return callCorsairPluginApi({
        accountId: input.accountId,
        plugin: mapped.plugin,
        resource: mapped.resource,
        action: mapped.action,
        payload: query ? { q: query, maxResults: 10 } : { maxResults: 10 },
      });
    }

    if (legacyKey === "googlecalendar:createEvent") {
      return callCorsairPluginApi({
        accountId: input.accountId,
        plugin: mapped.plugin,
        resource: mapped.resource,
        action: mapped.action,
        payload: {
          calendarId: input.payload.calendarId ?? "primary",
          event: {
            summary:
              typeof input.payload.summary === "string"
                ? input.payload.summary
                : "New meeting",
            attendees: input.payload.attendees,
            start: input.payload.start,
            end: input.payload.end,
          },
        },
      });
    }
  }

  const dotted = input.operation.match(/^([^.]+)\.(.+)$/);
  if (
    (input.plugin === "gmail" || input.plugin === "googlecalendar") &&
    dotted
  ) {
    return callCorsairPluginApi({
      accountId: input.accountId,
      plugin: input.plugin,
      resource: dotted[1]!,
      action: dotted[2]!,
      payload: input.payload,
    });
  }

  throw new Error(
    `Corsair operation ${input.plugin}.${input.operation} is not mapped to a plugin API call.`,
  );
}
