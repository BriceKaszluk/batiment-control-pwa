"use client";

import { CalendarDays, CheckCircle2, Flag, Loader2, Play } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  getCorrectiveActionPriorityLabel,
  getCorrectiveActionStatusLabel,
} from "@/features/corrective-actions/services/corrective-action-labels";
import type { CorrectiveAction } from "@/types/domain";

type CorrectiveActionListItemProps = {
  action: CorrectiveAction;
  buildingName?: string;
  userId: string | null;
};

export function CorrectiveActionListItem({
  action,
  buildingName,
  userId,
}: Readonly<CorrectiveActionListItemProps>) {
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<
    CorrectiveAction["status"] | null
  >(null);
  const canMarkInProgress = action.status === "open";
  const canMarkDone = action.status === "open" || action.status === "in_progress";

  function saveStatus(status: CorrectiveAction["status"]) {
    setError(null);
    setSavingStatus(status);

    void import("@/features/corrective-actions/services/local-corrective-actions")
      .then((localCorrectiveActionsModule) =>
        localCorrectiveActionsModule.updateCorrectiveActionStatus({
          actionId: action.id,
          status,
          userId,
        }),
      )
      .catch((error: unknown) => {
        setError(
          error instanceof Error ? error.message : "Reprise non enregistree",
        );
      })
      .finally(() => {
        setSavingStatus(null);
      });
  }

  return (
    <article className="surface-card space-y-4 p-4">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold leading-6">{action.title}</h3>
          <span className="status-pill border-primary/20 bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            {getCorrectiveActionStatusLabel(action.status)}
          </span>
        </div>

        {action.description ? (
          <p className="text-sm leading-5 text-muted-foreground">
            {action.description}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
          {buildingName ? <span>{buildingName}</span> : null}
          <span className="inline-flex items-center gap-1">
            <Flag aria-hidden="true" className="size-3.5" />
            {getCorrectiveActionPriorityLabel(action.priority)}
          </span>
          {action.dueDate ? (
            <span className="inline-flex items-center gap-1">
              <CalendarDays aria-hidden="true" className="size-3.5" />
              {action.dueDate}
            </span>
          ) : null}
        </div>
      </div>

      {canMarkInProgress || canMarkDone ? (
        <div className="grid grid-cols-2 gap-2">
          {canMarkInProgress ? (
            <Button
              className="h-11"
              disabled={!userId || savingStatus !== null}
              onClick={() => {
                saveStatus("in_progress");
              }}
              type="button"
              variant="outline"
            >
              {savingStatus === "in_progress" ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Play aria-hidden="true" className="size-4" />
              )}
              En cours
            </Button>
          ) : null}
          {canMarkDone ? (
            <Button
              className="h-11"
              disabled={!userId || savingStatus !== null}
              onClick={() => {
                saveStatus("done");
              }}
              type="button"
            >
              {savingStatus === "done" ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 aria-hidden="true" className="size-4" />
              )}
              Terminer
            </Button>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </article>
  );
}
