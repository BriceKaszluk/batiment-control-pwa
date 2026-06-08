"use client";

import { CheckCircle2, CircleX, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getBuildingAreaLabel } from "@/features/buildings/services/building-area-labels";
import type { LocalControlAreaEntry } from "@/features/controls/services/local-control-detail";
import { cn } from "@/lib/utils";
import type { ControlAreaResult } from "@/types/domain";

type ControlAreaResultsSectionProps = {
  controlId: string;
  entries: LocalControlAreaEntry[];
  userId: string | null;
};

const selectedStatusClasses: Record<ControlAreaResult["status"], string> = {
  satisfying: "border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  unsatisfying: "border-red-600 bg-red-50 text-red-800 hover:bg-red-100",
};

export function ControlAreaResultsSection({
  controlId,
  entries,
  userId,
}: Readonly<ControlAreaResultsSectionProps>) {
  if (entries.length === 0) {
    return (
      <div className="flex min-h-28 items-center justify-center rounded-md border bg-muted px-4 text-center text-sm text-muted-foreground">
        Aucun element de batiment a controler
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Elements controles</h2>
      </div>

      <div className="motion-list space-y-3">
        {entries.map((entry) => (
          <ControlAreaResultEditor
            controlId={controlId}
            entry={entry}
            key={entry.area}
            userId={userId}
          />
        ))}
      </div>
    </section>
  );
}

type ControlAreaResultEditorProps = {
  controlId: string;
  entry: LocalControlAreaEntry;
  userId: string | null;
};

function ControlAreaResultEditor({
  controlId,
  entry,
  userId,
}: Readonly<ControlAreaResultEditorProps>) {
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<
    ControlAreaResult["status"] | null
  >(null);
  const selectedStatus = entry.result?.status ?? null;

  function saveStatus(status: ControlAreaResult["status"]) {
    if (status === selectedStatus || savingStatus) {
      return;
    }

    setError(null);
    setSavingStatus(status);

    void import("@/features/controls/services/local-control-detail")
      .then((localControlDetailModule) =>
        localControlDetailModule.saveControlAreaResult({
          area: entry.area,
          controlId,
          status,
          userId,
        }),
      )
      .catch((error: unknown) => {
        setError(
          error instanceof Error ? error.message : "Element non enregistre",
        );
      })
      .finally(() => {
        setSavingStatus(null);
      });
  }

  return (
    <article className="surface-card space-y-3 p-4">
      <h3 className="text-base font-semibold">{getBuildingAreaLabel(entry.area)}</h3>

      <div className="grid grid-cols-2 gap-2">
        <Button
          aria-pressed={selectedStatus === "satisfying"}
          className={cn(
            "h-12 justify-start px-3",
            selectedStatus === "satisfying" &&
              selectedStatusClasses.satisfying,
          )}
          disabled={!userId || savingStatus !== null}
          onClick={() => {
            saveStatus("satisfying");
          }}
          type="button"
          variant="outline"
        >
          {savingStatus === "satisfying" ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 aria-hidden="true" className="size-4" />
          )}
          Satisfaisant
        </Button>
        <Button
          aria-pressed={selectedStatus === "unsatisfying"}
          className={cn(
            "h-12 justify-start px-3",
            selectedStatus === "unsatisfying" &&
              selectedStatusClasses.unsatisfying,
          )}
          disabled={!userId || savingStatus !== null}
          onClick={() => {
            saveStatus("unsatisfying");
          }}
          type="button"
          variant="outline"
        >
          {savingStatus === "unsatisfying" ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <CircleX aria-hidden="true" className="size-4" />
          )}
          Insatisfaisant
        </Button>
      </div>

      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </article>
  );
}
