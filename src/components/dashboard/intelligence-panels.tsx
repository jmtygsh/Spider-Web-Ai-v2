"use client";

import { useCallback, useState, type FC } from "react";
import { CalendarPlusIcon, Loader2Icon, ReplyIcon } from "lucide-react";

import type { MeetingPrepBrief } from "@/features/meeting-prep";
import type {
  RelationshipProfile,
  RelationshipSummary,
} from "@/features/relationship-intelligence";
import type {
  MeetingSuggestion,
  ReplySuggestion,
} from "@/features/suggestions";
import type { ApiResponse } from "@/server/types/api";
import { Button } from "@/components/ui/button";

type IntelligencePanelsProps = {
  meetingSuggestions: MeetingSuggestion[];
  replySuggestions: ReplySuggestion[];
  prepBriefs: MeetingPrepBrief[];
  relationshipProfiles: RelationshipProfile[];
  relationshipSummaries: RelationshipSummary[];
  formatDateTime: (value: string | null) => string;
  onExecuted?: () => void;
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

function buildScheduleCommand(suggestion: MeetingSuggestion) {
  const attendees =
    suggestion.meeting.attendeeEmails.length > 0
      ? ` with ${suggestion.meeting.attendeeEmails.join(", ")}`
      : "";
  const time = suggestion.meeting.suggestedStartLabel
    ? ` at ${suggestion.meeting.suggestedStartLabel}`
    : "";

  return `Schedule "${suggestion.meeting.summary}"${attendees}${time}`;
}

function buildReplyCommand(suggestion: ReplySuggestion) {
  return `Reply to thread ${suggestion.threadId}: ${suggestion.draftText.slice(0, 120)}`;
}

export const IntelligencePanels: FC<IntelligencePanelsProps> = ({
  meetingSuggestions,
  replySuggestions,
  prepBriefs,
  relationshipProfiles,
  relationshipSummaries,
  formatDateTime,
  onExecuted,
}) => {
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summariesByEmail = new Map(
    relationshipSummaries.map((summary) => [summary.personEmail, summary]),
  );

  const runCommand = useCallback(
    async (id: string, command: string) => {
      setExecutingId(id);
      setError(null);

      try {
        await readApiData(
          await fetch("/api/command/execute", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              command,
              forceExecute: true,
            }),
          }),
        );
        onExecuted?.();
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Command execution failed.",
        );
      } finally {
        setExecutingId(null);
      }
    },
    [onExecuted],
  );

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <section>
        <PanelHeading
          eyebrow="Schedule from email"
          title="Meeting suggestions"
          description="Detected scheduling intent with one-click calendar actions."
        />
        <div className="mt-4 space-y-3">
          {meetingSuggestions.length > 0 ? (
            meetingSuggestions.slice(0, 4).map((suggestion) => (
              <div
                key={suggestion.id}
                className="border-border rounded-2xl border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{suggestion.meeting.summary}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {suggestion.reason}
                    </p>
                    {suggestion.meeting.suggestedStartLabel ? (
                      <p className="text-muted-foreground mt-2 text-xs">
                        Suggested: {suggestion.meeting.suggestedStartLabel}
                      </p>
                    ) : null}
                    {suggestion.meeting.attendeeEmails.length > 0 ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        Attendees: {suggestion.meeting.attendeeEmails.join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <span className="bg-panel-muted rounded-full px-2.5 py-1 text-[11px] font-medium">
                    {Math.round(suggestion.confidence * 100)}%
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 rounded-full"
                  disabled={executingId === suggestion.id}
                  onClick={() =>
                    void runCommand(suggestion.id, buildScheduleCommand(suggestion))
                  }
                >
                  {executingId === suggestion.id ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <CalendarPlusIcon className="size-4" />
                  )}
                  Create meeting
                </Button>
              </div>
            ))
          ) : (
            <EmptyCopy copy="Meeting suggestions appear when scheduling intent is extracted from email threads." />
          )}
        </div>
      </section>

      <section>
        <PanelHeading
          eyebrow="Draft replies"
          title="Suggested responses"
          description="Reply drafts generated from commitments and thread context."
        />
        <div className="mt-4 space-y-3">
          {replySuggestions.length > 0 ? (
            replySuggestions.slice(0, 3).map((suggestion) => (
              <div key={suggestion.id} className="bg-panel-muted rounded-2xl p-4">
                <p className="text-muted-foreground text-xs">{suggestion.reason}</p>
                <p className="mt-2 text-sm leading-relaxed">{suggestion.draftText}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3 rounded-full"
                  disabled={executingId === suggestion.id}
                  onClick={() =>
                    void runCommand(suggestion.id, buildReplyCommand(suggestion))
                  }
                >
                  {executingId === suggestion.id ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <ReplyIcon className="size-4" />
                  )}
                  Send draft
                </Button>
              </div>
            ))
          ) : (
            <EmptyCopy copy="Reply suggestions populate after thread extraction and linking." />
          )}
        </div>
      </section>

      <section>
        <PanelHeading
          eyebrow="Meeting prep"
          title="What needs to happen before the meeting"
          description="Briefs generated from linked threads, commitments, and people context."
        />
        <div className="mt-4 space-y-3">
          {prepBriefs.length > 0 ? (
            prepBriefs.slice(0, 4).map((brief) => (
              <div key={brief.id} className="bg-panel-muted rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{brief.summary}</p>
                  <span className="bg-panel rounded-full px-2.5 py-1 text-[11px] font-medium">
                    {brief.unansweredCount} open
                  </span>
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  Topics: {brief.topics.join(", ") || "No topics yet"}
                </p>
                {brief.risks.length > 0 ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Risks: {brief.risks.join("; ")}
                  </p>
                ) : null}
                {brief.suggestedReply ? (
                  <p className="text-muted-foreground mt-2 line-clamp-3 text-xs italic">
                    Suggested update: {brief.suggestedReply}
                  </p>
                ) : null}
                {brief.nextActions.length > 0 ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Next: {brief.nextActions[0]}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <EmptyCopy copy="Meeting prep briefs will populate after meeting and thread linking runs." />
          )}
        </div>
      </section>

      <section>
        <PanelHeading
          eyebrow="Relationships"
          title="Who needs attention"
          description="CRM-lite relationship intelligence derived from your communication graph."
        />
        <div className="mt-4 space-y-3">
          {relationshipProfiles.length > 0 ? (
            relationshipProfiles.slice(0, 5).map((profile) => {
              const summary = summariesByEmail.get(profile.personEmail);

              return (
                <div key={profile.id} className="border-border rounded-2xl border p-4">
                  <p className="text-sm font-medium">
                    {profile.personName ?? profile.personEmail}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {profile.emailCount} emails, {profile.meetingCount} meetings, avg
                    response{" "}
                    {profile.averageResponseLatencyHours == null
                      ? "n/a"
                      : `${profile.averageResponseLatencyHours.toFixed(1)}h`}
                  </p>
                  {profile.lastMeeting ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Last meeting: {profile.lastMeeting.title ?? "Untitled"} (
                      {formatDateTime(profile.lastMeeting.startAt)})
                    </p>
                  ) : null}
                  {profile.openRequests.length > 0 ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Open requests: {profile.openRequests.slice(0, 2).join("; ")}
                    </p>
                  ) : null}
                  {profile.pendingTasks.length > 0 ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Pending: {profile.pendingTasks.slice(0, 2).join("; ")}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground mt-2 text-xs">
                    Topics: {profile.activeTopics.join(", ") || "No active topics"}
                  </p>
                  {summary ? (
                    <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                      {summary.summary}
                    </p>
                  ) : null}
                </div>
              );
            })
          ) : (
            <EmptyCopy copy="Relationship profiles appear after person linking and enrichment complete." />
          )}
        </div>
      </section>
    </div>
  );
};

const PanelHeading: FC<{
  eyebrow: string;
  title: string;
  description: string;
}> = ({ eyebrow, title, description }) => (
  <>
    <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
      {eyebrow}
    </p>
    <h2 className="mt-1 text-lg font-semibold">{title}</h2>
    <p className="text-muted-foreground mt-2 text-sm">{description}</p>
  </>
);

const EmptyCopy: FC<{ copy: string }> = ({ copy }) => (
  <div className="text-muted-foreground rounded-2xl border border-dashed border-border px-4 py-6 text-sm">
    {copy}
  </div>
);
