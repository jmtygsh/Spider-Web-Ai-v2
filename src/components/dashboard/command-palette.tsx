"use client";

import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import { CommandIcon, Loader2Icon } from "lucide-react";

import type {
  CommandExecutionResult,
  CommandPreviewResult,
} from "@/features/command-execution";
import type { ApiResponse } from "@/server/types/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type CommandPaletteProps = {
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

export const CommandPalette: FC<CommandPaletteProps> = ({ onExecuted }) => {
  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [preview, setPreview] = useState<CommandPreviewResult | null>(null);
  const [result, setResult] = useState<CommandExecutionResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canExecute = useMemo(() => {
    return command.trim().length > 0 && !loadingPreview && !executing;
  }, [command, executing, loadingPreview]);

  const resetState = useCallback(() => {
    setPreview(null);
    setResult(null);
    setError(null);
  }, []);

  const loadPreview = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setPreview(null);
      return;
    }

    setLoadingPreview(true);
    setError(null);

    try {
      const data = await readApiData<CommandPreviewResult>(
        await fetch("/api/command/preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ command: trimmed }),
        }),
      );
      setPreview(data);
    } catch (caughtError) {
      setPreview(null);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to preview command.",
      );
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const runExecute = useCallback(
    async (forceExecute = false) => {
      const trimmed = command.trim();
      if (!trimmed) {
        return;
      }

      setExecuting(true);
      setError(null);

      try {
        const data = await readApiData<CommandExecutionResult>(
          await fetch("/api/command/execute", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              command: trimmed,
              forceExecute,
            }),
          }),
        );

        setResult(data);

        if (data.status === "completed") {
          onExecuted?.();
        }
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to execute command.",
        );
      } finally {
        setExecuting(false);
      }
    },
    [command, onExecuted],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadPreview(command);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [command, loadPreview, open]);

  useEffect(() => {
    if (!open) {
      setCommand("");
      resetState();
    }
  }, [open, resetState]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="bg-panel-muted hidden rounded-full sm:inline-flex"
        onClick={() => setOpen(true)}
      >
        <CommandIcon className="size-4" />
        Command
        <span className="text-muted-foreground text-xs">Ctrl/Cmd + K</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>Command Center</DialogTitle>
            <DialogDescription>
              Run email and calendar actions without leaving the dashboard. Try
              {" "}
              <span className="text-foreground font-medium">
                meeting john next thursday
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              autoFocus
              value={command}
              onChange={(event) => {
                setCommand(event.target.value);
                setResult(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canExecute) {
                  event.preventDefault();
                  void runExecute(result?.status === "approval_required");
                }
              }}
              placeholder="Type a command..."
              className="h-12 rounded-2xl px-4 text-base"
            />

            {loadingPreview ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2Icon className="size-4 animate-spin" />
                Parsing command...
              </div>
            ) : null}

            {preview ? (
              <div className="border-border bg-panel-muted space-y-3 rounded-2xl border p-4">
                <div>
                  <p className="text-sm font-medium">{preview.preview.title}</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {preview.preview.summary}
                  </p>
                </div>

                {preview.preview.resolvedSummary.length > 0 ? (
                  <div>
                    <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase">
                      Resolved context
                    </p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {preview.preview.resolvedSummary.map((entry) => (
                        <li key={entry}>{entry}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div>
                  <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase">
                    Planned steps
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {preview.preview.plannedSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            {result ? (
              <div className="border-border bg-panel rounded-2xl border p-4">
                <p className="text-sm font-medium capitalize">
                  {result.status.replace("-", " ")} via {result.mode}
                </p>
                <p className="text-muted-foreground mt-2 text-sm">{result.message}</p>
                {result.steps && result.steps.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {result.steps.map((step) => (
                      <li key={step.stepId} className="rounded-xl bg-panel-muted px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{step.action}</span>
                          <span className="text-muted-foreground capitalize">
                            {step.status}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {step.message}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : null}
          </div>

          <DialogFooter>
            {result?.status === "approval_required" ? (
              <Button
                type="button"
                onClick={() => void runExecute(true)}
                disabled={executing}
              >
                {executing ? "Running..." : "Approve and run"}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => void runExecute(false)}
                disabled={!canExecute}
              >
                {executing ? "Running..." : "Run command"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
