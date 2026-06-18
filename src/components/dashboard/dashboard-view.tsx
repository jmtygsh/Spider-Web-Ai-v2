"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { CommandCenterSummary } from "@/features/command-center";
import type { ApiResponse } from "@/server/types/api";
import { useCallback, useEffect, useState, type FC } from "react";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";
import { CommandPalette } from "@/app/(client)/(protected)/dashboard/command-palette";
import { InboxTriagePanel } from "@/app/(client)/(protected)/dashboard/inbox-triage-panel";
import { IntelligencePanels } from "@/app/(client)/(protected)/dashboard/intelligence-panels";
import { useRealtimeIntegrationEvents } from "@/app/(client)/(protected)/dashboard/use-realtime-integration-events";

const EmptyPanel: FC<{ copy: string }> = ({ copy }) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
      <p className="text-muted-foreground text-xs font-medium">{copy}</p>
    </div>
  );
};

const SectionTitle: FC<{ eyebrow: string; title: string }> = ({ eyebrow, title }) => {
  return (
    <div className="space-y-0.5">
      <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
        {eyebrow}
      </p>
      <h2 className="text-[14px] font-medium tracking-tight text-foreground">{title}</h2>
    </div>
  );
};

const MetricCard: FC<{ title: string; value: string; label: string; glowColor: string }> = ({ title, value, label, glowColor }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80">
      <div className={cn("absolute -top-12 -right-12 w-32 h-32 blur-[40px] opacity-20 dark:opacity-20 pointer-events-none rounded-full", glowColor)} />
      <div className="relative z-10">
        <p className="text-muted-foreground font-medium text-[13px]">{title}</p>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-foreground tabular-nums tracking-tight">{value}</span>
          <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        </div>
      </div>
    </div>
  );
};

const DashboardAssistantPanel = dynamic(() => import("@/app/(client)/(protected)/dashboard/assistant-panel"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-4">
      <EmptyPanel copy="Loading assistant runtime..." />
    </div>
  ),
});

function formatDateTime(value: string | null) {
  if (!value) return "No time";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatRelativeTime(value: string | null) {
  if (!value) return "No activity yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const diffMinutes = Math.round((parsed.getTime() - Date.now()) / 60_000);
  const absMinutes = Math.abs(diffMinutes);
  if (absMinutes < 60) return diffMinutes >= 0 ? `in ${absMinutes} min` : `${absMinutes} min ago`;
  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) return diffMinutes >= 0 ? `in ${absHours} hr` : `${absHours} hr ago`;
  const absDays = Math.round(absHours / 24);
  return diffMinutes >= 0 ? `in ${absDays} day` : `${absDays} day ago`;
}

type ViewState = 'assistant' | 'triage' | 'runs' | 'connections' | 'logs';

export const DashboardView: FC = () => {
  const [summary, setSummary] = useState<CommandCenterSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<ViewState>('assistant');

  const loadSummary = useCallback(async (mode: "initial" | "refresh" = "refresh") => {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);

    try {
      const response = await fetch("/api/command-center", { method: "GET", cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<CommandCenterSummary>;
      if (!response.ok || !payload.ok) throw new Error(payload.ok ? "Failed to load command center." : payload.error.message);
      setSummary(payload.data);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to load command center.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const requestSync = useCallback(async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/plugin/sync", { method: "POST" });
      if (!response.ok) throw new Error(`Sync request failed: ${response.status}`);
      await loadSummary();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Sync request failed.");
    } finally {
      setSyncing(false);
    }
  }, [loadSummary]);

  const handleIntegrationEvents = useCallback(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    void loadSummary("initial");
    const timer = window.setInterval(() => void loadSummary(), 30_000);
    return () => window.clearInterval(timer);
  }, [loadSummary]);

  useRealtimeIntegrationEvents({ onEvents: handleIntegrationEvents });

  const timelineItems = summary?.timelineItems.slice(0, 10) ?? [];
  const executionLogs = summary?.executionLogs.slice(0, 8) ?? [];
  const agentRuns = summary?.agentRuns.slice(0, 6) ?? [];
  const meetings = summary?.meetings.slice(0, 5) ?? [];

  const navItems = [
    { id: 'assistant', label: 'Assistant', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /><path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" /></svg> },
    { id: 'triage', label: 'Inbox & Triage', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg> },
    { id: 'runs', label: 'AI Runs', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 8v8" /><path d="m8 12 4-4 4 4" /></svg> },
  ];

  const bottomNavItems = [
    { id: 'connections', label: 'Connections', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg> },
    { id: 'logs', label: 'System Logs', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5" /><line x1="12" x2="20" y1="19" y2="19" /></svg> },
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground font-sans overflow-hidden selection:bg-indigo-500/30">
      <Toaster richColors closeButton position="top-right" />

      {/* 1. Thin Left Sidebar */}
      <aside className="w-[64px] flex flex-col items-center py-5 border-r border-border bg-card shrink-0 z-10">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-8 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
        </div>

        <div className="flex flex-col gap-3 w-full px-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as ViewState)}
              title={item.label}
              className={cn(
                "relative flex items-center justify-center w-full h-11 rounded-xl transition-all duration-200 group",
                currentView === item.id
                  ? "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {currentView === item.id && (
                <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-full" />
              )}
              {item.icon}
            </button>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-3 w-full px-2">
          {bottomNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as ViewState)}
              title={item.label}
              className={cn(
                "relative flex items-center justify-center w-full h-11 rounded-xl transition-all duration-200 group",
                currentView === item.id
                  ? "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {currentView === item.id && (
                <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-full" />
              )}
              {item.icon}
            </button>
          ))}
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex-1 flex min-w-0 bg-background relative">
        {/* Scrollable Center Pane */}
        <div className="flex-1 flex flex-col min-w-0 p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-[1200px] w-full mx-auto flex flex-col gap-6 lg:gap-8 h-full min-h-0">

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
              <div>
                <h1 className="text-[22px] font-semibold text-foreground tracking-tight">Command Center</h1>
                <p className="text-[13px] text-muted-foreground mt-1">Email and calendar as one workflow system</p>
              </div>
              <div className="flex items-center gap-3">
                <CommandPalette onExecuted={() => void loadSummary()} />
                <Link
                  href="/connect"
                  className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-4 py-1.5 text-[12px] font-semibold tracking-wide transition-colors"
                >
                  Connect Integrations
                </Link>
                <button
                  onClick={() => void loadSummary()}
                  disabled={refreshing || loading}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 uppercase tracking-wider"
                >
                  {refreshing ? "Refreshing" : "Refresh"}
                </button>
                <button
                  onClick={() => void requestSync()}
                  disabled={syncing}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {syncing ? "Syncing..." : "Sync"}
                </button>
              </div>
            </header>

            {/* Error Banner */}
            {error && (
              <div className="px-4 py-3 rounded-lg border border-rose-500/20 bg-rose-500/10 text-sm text-rose-400 shrink-0">
                {error}
              </div>
            )}

            {/* Top 4 Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
              <MetricCard title="Inbox Triage" value={String(summary?.stats.inboxTriageItems ?? 0)} label="Items to review" glowColor="bg-blue-500" />
              <MetricCard title="Action Suggestions" value={String((summary?.stats.meetingSuggestions ?? 0) + (summary?.stats.replySuggestions ?? 0))} label="Pending tasks" glowColor="bg-indigo-500" />
              <MetricCard title="Meeting Prep" value={String(summary?.stats.prepBriefs ?? 0)} label="Briefs ready" glowColor="bg-amber-500" />
              <MetricCard title="Connections" value={String(summary?.stats.connectedIntegrations ?? 0)} label="Active integrations" glowColor="bg-emerald-500" />
            </div>

            {/* Main Panel Container */}
            <div className="flex-1 bg-card border border-border rounded-2xl flex flex-col shadow-sm overflow-hidden min-h-[500px]">

              {currentView === 'assistant' && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="border-b border-border px-6 py-4 shrink-0 bg-muted/20">
                    <h2 className="text-[15px] font-medium text-foreground">Talk to your email</h2>
                  </div>
                  <DashboardAssistantPanel />
                </div>
              )}

              {currentView === 'triage' && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="border-b border-border px-6 py-4 shrink-0 bg-muted/20">
                    <h2 className="text-[15px] font-medium text-foreground">Smart Buckets</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    {loading || !summary ? (
                      <EmptyPanel copy="Loading triage..." />
                    ) : (
                      <InboxTriagePanel
                        triage={summary.inboxTriage}
                        pendingAiScan={summary.stats.pendingAiScan}
                        formatRelativeTime={formatRelativeTime}
                      />
                    )}
                  </div>
                </div>
              )}

              {currentView === 'runs' && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="border-b border-border px-6 py-4 shrink-0 bg-muted/20">
                    <h2 className="text-[15px] font-medium text-foreground">Agent Runtime</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    {agentRuns.length > 0 ? (
                      <div className="space-y-3">
                        {agentRuns.map((run) => (
                          <div key={run.id} className="rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/50">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[13px] font-medium text-foreground">{run.inputSummary}</p>
                              <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">{run.status}</span>
                            </div>
                            <p className="text-muted-foreground mt-1 text-[11px] tabular-nums">
                              {run.purpose.replaceAll("_", " ")} · {formatDateTime(run.startedAt)}
                            </p>
                            {run.outcome ? (
                              <p className="text-muted-foreground mt-2 line-clamp-2 text-[13px] leading-relaxed">{run.outcome.summary}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyPanel copy="No recent agent runs." />
                    )}
                  </div>
                </div>
              )}

              {currentView === 'connections' && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="border-b border-border px-6 py-4 shrink-0 bg-muted/20">
                    <h2 className="text-[15px] font-medium text-foreground">Workspace Readiness</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="max-w-2xl space-y-3">
                      {summary?.connections.map((connection) => (
                        <div key={connection.pluginId} className="group rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/50">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[13px] font-medium text-foreground">
                                {connection.pluginId === "gmail" ? "Gmail" : "Google Calendar"}
                              </p>
                              <p className="text-muted-foreground mt-0.5 text-[11px]">
                                {connection.connected ? `Connected: ${connection.accountId}` : "Not connected yet"}
                              </p>
                            </div>
                            <span className={cn(
                              "rounded-md px-2 py-1 text-[10px] font-medium tracking-wider uppercase",
                              connection.connected ? "text-emerald-500 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-400/10" : "text-muted-foreground bg-muted",
                            )}>
                              {connection.connected ? "Active" : "Pending"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentView === 'logs' && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="border-b border-border px-6 py-4 shrink-0 bg-muted/20">
                    <h2 className="text-[15px] font-medium text-foreground">System Logs</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    {executionLogs.length > 0 ? (
                      <div className="space-y-2">
                        {executionLogs.map((entry) => (
                          <div key={entry.id} className="rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/50">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[13px] font-medium text-foreground">{entry.message}</p>
                              <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">{entry.status}</span>
                            </div>
                            <p className="text-muted-foreground mt-1 text-[11px] tabular-nums">
                              {formatDateTime(entry.createdAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyPanel copy="No recent execution logs." />
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* 3. Right Sidebar (Notifications / Feed) */}
        <aside className="w-[320px] xl:w-[380px] border-l border-border bg-card flex flex-col shrink-0 hidden lg:flex">
          <div className="p-5 border-b border-border shrink-0 flex items-center justify-between bg-muted/10">
            <h2 className="text-[14px] font-semibold text-foreground">Activity & Context</h2>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-8">

            {/* Suggested Action */}
            {summary?.nextBestAction && (
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/[0.02] p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-6 w-6 rounded-full bg-indigo-500/10 items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500 dark:text-indigo-400"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <p className="text-[11px] font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">Suggested Action</p>
                </div>
                <p className="text-[13px] font-medium text-foreground">{summary.nextBestAction.action}</p>
                <p className="text-[12px] text-muted-foreground mt-1">{summary.nextBestAction.reason}</p>
              </div>
            )}

            {/* Timeline */}
            <div>
              <SectionTitle title="Workflow Feed" eyebrow="Timeline" />
              <div className="mt-5 space-y-4">
                {loading ? (
                  <EmptyPanel copy="Loading feed..." />
                ) : timelineItems.length > 0 ? (
                  timelineItems.map((item) => (
                    <div key={item.id} className="relative pl-4 border-l-2 border-border pb-1 last:pb-0">
                      <div className="absolute w-2 h-2 rounded-full bg-indigo-500/50 -left-[5px] top-1.5 ring-4 ring-card" />
                      <p className="text-[13px] font-medium text-foreground">{item.title}</p>
                      <p className="text-muted-foreground mt-1 text-[12px] leading-relaxed">{item.summary}</p>
                      <p className="text-muted-foreground mt-2 text-[10px] font-medium uppercase tracking-wider">{formatRelativeTime(item.eventAt)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyPanel copy="No recent activity." />
                )}
              </div>
            </div>

            {/* Upcoming Meetings */}
            <div>
              <SectionTitle title="Upcoming" eyebrow="Meetings" />
              <div className="mt-4 space-y-2">
                {meetings.length > 0 ? (
                  meetings.map((meeting) => (
                    <div key={meeting.id} className="rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/50">
                      <p className="text-[13px] font-medium text-foreground truncate">{meeting.title ?? meeting.externalMeetingId}</p>
                      <p className="text-muted-foreground mt-1 text-[11px] tabular-nums">{formatDateTime(meeting.startAt)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyPanel copy="No upcoming meetings." />
                )}
              </div>
            </div>

            {/* Intelligence */}
            <div>
              <SectionTitle title="Intelligence" eyebrow="Context" />
              <div className="mt-4">
                {loading || !summary ? (
                  <EmptyPanel copy="Loading intelligence..." />
                ) : (
                  <IntelligencePanels
                    meetingSuggestions={summary.meetingSuggestions}
                    replySuggestions={summary.replySuggestions}
                    prepBriefs={summary.prepBriefs}
                    relationshipProfiles={summary.relationshipProfiles}
                    relationshipSummaries={summary.relationshipSummaries}
                    formatDateTime={formatDateTime}
                    onExecuted={() => void loadSummary()}
                  />
                )}
              </div>
            </div>

          </div>
        </aside>

      </main>
    </div>
  );
};
