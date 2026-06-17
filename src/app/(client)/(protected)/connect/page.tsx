"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { apiGet } from "@/lib/api-call";
import type {
  ConnectionStatusSnapshot,
  IntegrationSyncStatus,
} from "@/types/sync";

type ConnectionCardProps = {
  status: IntegrationSyncStatus;
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
};

// Purpose:
// Renders one integration row (Gmail or Calendar) with its current status.
// Runs whenever the parent page re-renders with updated connection data.
// Shows a "Connect" link when disconnected, or a status badge when connected.
function ConnectionCard({
  status,
  href,
  title,
  description,
  icon,
}: ConnectionCardProps) {
  // True while the server is still fetching the first batch of mail or events.
  const isSyncing =
    status.syncStatus === "queued" ||
    status.syncStatus === "priming" ||
    status.syncStatus === "backfilling";
  const isFailed = status.syncStatus === "failed";

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
        // Connected — show sync status (spinning, checkmark, or error).
        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${isFailed
            ? "bg-[var(--status-error-bg)] text-[var(--status-error)]"
            : "text-secondary bg-secondary/10"
            }`}
        >
          {isSyncing ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : isFailed ? (
            <span className="h-3.5 w-3.5 rounded-full bg-current/20" />
          ) : (
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {status.statusText}
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

// Default state shown before the first API response arrives.
const EMPTY_SNAPSHOT: ConnectionStatusSnapshot = {
  gmail: {
    plugin: "gmail",
    connected: false,
    connectionStatus: "disconnected",
    syncStatus: "idle",
    isReady: false,
    isBackfillComplete: false,
    itemsPrimed: 0,
    itemsBackfilled: 0,
    estimatedTotal: null,
    remainingItems: null,
    statusText: "Not connected",
    lastError: null,
    lastSyncStartedAt: null,
    lastSyncCompletedAt: null,
    lastWebhookAt: null,
    updatedAt: null,
  },
  googlecalendar: {
    plugin: "googlecalendar",
    connected: false,
    connectionStatus: "disconnected",
    syncStatus: "idle",
    isReady: false,
    isBackfillComplete: false,
    itemsPrimed: 0,
    itemsBackfilled: 0,
    estimatedTotal: null,
    remainingItems: null,
    statusText: "Not connected",
    lastError: null,
    lastSyncStartedAt: null,
    lastSyncCompletedAt: null,
    lastWebhookAt: null,
    updatedAt: null,
  },
  allConnected: false,
  allReady: false,
  blockingSyncCount: 0,
  backgroundSyncCount: 0,
};

// Purpose:
// Onboarding page where users connect Gmail and Google Calendar.
// Runs after login when integrations are not fully synced yet.
// Polls connection status and redirects to the dashboard when both are ready.
export default function ConnectPage() {
  const router = useRouter();
  // Latest Gmail + Calendar connection and sync status from the server.
  const [snapshot, setSnapshot] = useState<ConnectionStatusSnapshot>(EMPTY_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Loads connection status on mount and refreshes every 5 seconds while syncing.
  useEffect(() => {
    // Prevents state updates if the user navigates away before the request finishes.
    let cancelled = false;

    // Fetches current integration status from GET /api/connections.
    async function load() {
      try {
        const next = await apiGet<ConnectionStatusSnapshot>("/api/connections");
        if (cancelled) {
          return;
        }

        setSnapshot(next);
        setError(null);
        // Both integrations connected and initial sync done — go to the main app.
        if (next.allReady) {
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
    // Keep polling so the UI updates as background sync progresses.
    const timer = window.setInterval(() => {
      void load();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [router]);

  // How many of the two required integrations (Gmail + Calendar) are connected.
  const connectedCount = useMemo(
    () =>
      [snapshot.gmail.connected, snapshot.googlecalendar.connected].filter(
        Boolean,
      ).length,
    [snapshot],
  );

  const progressPct = (connectedCount / 2) * 100;
  // Human-readable message shown below the progress bar based on current sync state.
  const statusText = error
    ? error
    : snapshot.blockingSyncCount > 0
      ? "Syncing your first data so the dashboard is ready."
      : snapshot.backgroundSyncCount > 0
        ? `${snapshot.backgroundSyncCount} background sync${snapshot.backgroundSyncCount > 1 ? "s" : ""} still running.`
        : connectedCount === 0
          ? "Connect both Google services to unlock your dashboard."
          : "One more connection is required before entering the dashboard.";

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
          <ConnectionCard
            status={snapshot.gmail}
            href="/api/connect?plugin=gmail"
            title="Gmail"
            description="Read, compose, and send emails"
            icon={
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
            }
          />

          <ConnectionCard
            status={snapshot.googlecalendar}
            href="/api/connect?plugin=googlecalendar"
            title="Google Calendar"
            description="View, create, and update events"
            icon={
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
            }
          />
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-muted-foreground text-xs">
              {connectedCount} of 2 accounts connected
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
