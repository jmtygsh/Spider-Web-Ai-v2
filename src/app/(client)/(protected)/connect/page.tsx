"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
  CONNECT_PLUGIN_IDS,
  CONNECT_PLUGINS,
  type ConnectPluginId,
} from "@/constants/plugins";
import { apiGet } from "@/lib/api-call";
import { storage } from "@/lib/local-storage";

type ConnectionState = {
  connected: boolean;
  connectionStatus: "connected" | "disconnected";
  statusText: string;
};

type PluginStatusResponse = Record<ConnectPluginId, boolean>;
type ConnectionStatusSnapshot = Record<ConnectPluginId, ConnectionState> & {
  allConnected: boolean;
};

type ConnectionCardProps = {
  status: ConnectionState;
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
};

function createConnectionState(connected: boolean): ConnectionState {
  return {
    connected,
    connectionStatus: connected ? "connected" : "disconnected",
    statusText: connected ? "Connected" : "Not connected",
  };
}

function createSnapshot(
  status: PluginStatusResponse,
): ConnectionStatusSnapshot {
  const connectionStates = Object.fromEntries(
    CONNECT_PLUGIN_IDS.map((pluginId) => [
      pluginId,
      createConnectionState(status[pluginId]),
    ]),
  ) as Record<ConnectPluginId, ConnectionState>;

  return {
    ...connectionStates,
    allConnected: CONNECT_PLUGIN_IDS.every((pluginId) => status[pluginId]),
  };
}

const EMPTY_STATUS = Object.fromEntries(
  CONNECT_PLUGIN_IDS.map((pluginId) => [pluginId, false]),
) as PluginStatusResponse;

const EMPTY_SNAPSHOT = createSnapshot(EMPTY_STATUS);

function getPluginIcon(pluginId: ConnectPluginId) {
  if (pluginId === "gmail") {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--status-error)]/20 bg-[var(--status-error-bg)]">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path
            d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
            fill="#EA4335"
            fillOpacity="0.15"
          />
          <path
            d="M2 6l10 7 10-7"
            stroke="#EA4335"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--status-info)]/20 bg-[var(--status-info-bg)]">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <rect
          x="3"
          y="4"
          width="18"
          height="18"
          rx="2"
          fill="#4285F4"
          fillOpacity="0.12"
          stroke="#4285F4"
          strokeWidth="1.5"
        />
        <path d="M3 9h18" stroke="#4285F4" strokeWidth="1.5" />
        <path
          d="M8 2v4M16 2v4"
          stroke="#4285F4"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M8 14h4M8 17h2"
          stroke="#4285F4"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function ConnectionCard({
  status,
  href,
  title,
  description,
  icon,
}: ConnectionCardProps) {
  return (
    <div
      className={`bg-card flex items-center gap-4 rounded-xl border p-4 transition-colors ${status.connected ? "border-secondary/40 bg-secondary/5" : "border-border"}`}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-sm font-medium">{title}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
      </div>
      {status.connected ? (
        <span className="text-secondary bg-secondary/10 flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Connected
        </span>
      ) : (
        // Not connected — link starts OAuth via /api/connect.
        <a
          href={href}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all active:scale-95"
        >
          Connect
        </a>
      )}
    </div>
  );
}

export default function ConnectPage() {
  const router = useRouter();
  const [snapshot, setSnapshot] =
    useState<ConnectionStatusSnapshot>(EMPTY_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cachedStatus = Object.fromEntries(
      CONNECT_PLUGIN_IDS.map((pluginId) => [
        pluginId,
        storage.get<boolean>(CONNECT_PLUGINS[pluginId].storageKey) === true,
      ]),
    ) as PluginStatusResponse;
    const hasCachedConnection = CONNECT_PLUGIN_IDS.some(
      (pluginId) => cachedStatus[pluginId],
    );

    if (hasCachedConnection) {
      setSnapshot(createSnapshot(cachedStatus));
    }

    if (CONNECT_PLUGIN_IDS.every((pluginId) => cachedStatus[pluginId])) {
      setIsLoading(false);
      router.replace("/dashboard");
      return;
    }

    async function load() {
      try {
        const next = await apiGet<PluginStatusResponse>("/api/plugin/status");
        if (cancelled) {
          return;
        }

        for (const pluginId of CONNECT_PLUGIN_IDS) {
          if (next[pluginId]) {
            storage.set(CONNECT_PLUGINS[pluginId].storageKey, true);
          } else {
            storage.remove(CONNECT_PLUGINS[pluginId].storageKey);
          }
        }

        const nextSnapshot = createSnapshot(next);

        setSnapshot(nextSnapshot);
        setError(null);

        if (nextSnapshot.allConnected) {
          void apiGet<boolean>("/api/plugin/sync").catch(() => undefined);
          router.replace("/dashboard");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Connections read failed",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const connectedCount = CONNECT_PLUGIN_IDS.reduce(
    (count, pluginId) => count + Number(snapshot[pluginId].connected),
    0,
  );
  const progressPct = (connectedCount / CONNECT_PLUGIN_IDS.length) * 100;
  const statusText = error
    ? error
    : connectedCount === 0
      ? "Connect both Google services to unlock your dashboard."
      : connectedCount === 1
        ? "One more connection is required before entering the dashboard."
        : "Both required accounts are connected. Redirecting to your dashboard.";

  if (isLoading) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="bg-primary/10 ring-primary/20 mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ring-1">
            <svg
              viewBox="0 0 24 24"
              className="text-primary h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
              <path
                d="M5.636 5.636l2.121 2.121M16.243 16.243l2.121 2.121M5.636 18.364l2.121-2.121M16.243 7.757l2.121-2.121"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Connect your accounts
          </h1>
          <p className="text-muted-foreground mx-auto mt-2 max-w-xs text-sm">
            SpiderWeb needs access to your Google services to manage emails and
            calendar on your behalf.
          </p>
        </div>

        <div className="space-y-3">
          {CONNECT_PLUGIN_IDS.map((pluginId) => {
            const plugin = CONNECT_PLUGINS[pluginId];

            return (
              <ConnectionCard
                key={pluginId}
                status={snapshot[pluginId]}
                href={plugin.connectPath}
                title={plugin.title}
                description={plugin.description}
                icon={getPluginIcon(pluginId)}
              />
            );
          })}
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-muted-foreground text-xs">
              {connectedCount} of {CONNECT_PLUGIN_IDS.length} accounts connected
            </p>
            <p className="text-foreground text-xs font-medium">
              {progressPct}%
            </p>
          </div>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <p className="text-muted-foreground mt-8 text-center text-xs">
          {statusText}
        </p>
      </div>
    </main>
  );
}
