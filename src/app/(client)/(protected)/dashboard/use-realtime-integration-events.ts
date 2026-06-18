"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import type { RecentIntegrationEvent } from "@/features/command-execution";
import type { ApiResponse } from "@/server/types/api";

type RecentEventsResponse = {
  events: RecentIntegrationEvent[];
};

async function readApiData<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.ok) {
    throw new Error(
      payload.ok ? `Request failed: ${response.status}` : payload.error.message,
    );
  }

  return payload.data;
}

function formatEventLabel(event: RecentIntegrationEvent) {
  return event.eventType.replaceAll(".", " ");
}

function getLatestCreatedAt(events: RecentIntegrationEvent[]) {
  return events.reduce<string | null>((latest, event) => {
    if (!latest || event.createdAt > latest) {
      return event.createdAt;
    }

    return latest;
  }, null);
}

export function useRealtimeIntegrationEvents(input?: {
  enabled?: boolean;
  pollIntervalMs?: number;
  onEvents?: (events: RecentIntegrationEvent[]) => void;
}) {
  const enabled = input?.enabled ?? true;
  const pollIntervalMs = input?.pollIntervalMs ?? 5000;
  const onEventsRef = useRef(input?.onEvents);
  onEventsRef.current = input?.onEvents;

  const lastSeenAtRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const inFlightRef = useRef(false);
  const processedEventIdsRef = useRef(new Set<string>());

  const poll = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;

    try {
      if (!initializedRef.current) {
        const baseline = await readApiData<RecentEventsResponse>(
          await fetch("/api/events/recent?limit=1", {
            method: "GET",
            cache: "no-store",
          }),
        );

        const latestEvent = baseline.events[0];
        if (latestEvent) {
          lastSeenAtRef.current = latestEvent.createdAt;
          processedEventIdsRef.current.add(latestEvent.id);
        }

        initializedRef.current = true;
        return;
      }

      const since = lastSeenAtRef.current;
      if (!since) {
        return;
      }

      const data = await readApiData<RecentEventsResponse>(
        await fetch(
          `/api/events/recent?since=${encodeURIComponent(since)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        ),
      );

      const newEvents = data.events.filter(
        (event) => !processedEventIdsRef.current.has(event.id),
      );

      if (newEvents.length === 0) {
        return;
      }

      const latestCreatedAt = getLatestCreatedAt(newEvents);
      if (latestCreatedAt) {
        lastSeenAtRef.current = latestCreatedAt;
      }

      for (const event of newEvents) {
        processedEventIdsRef.current.add(event.id);
      }

      if (processedEventIdsRef.current.size > 500) {
        processedEventIdsRef.current = new Set(
          [...processedEventIdsRef.current].slice(-200),
        );
      }

      for (const event of [...newEvents].reverse()) {
        toast.info(`Live update: ${formatEventLabel(event)}`, {
          description: "Command center data was refreshed from Corsair webhooks.",
        });
      }

      onEventsRef.current?.(newEvents);
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, pollIntervalMs);

    return () => window.clearInterval(timer);
  }, [enabled, poll, pollIntervalMs]);
}
