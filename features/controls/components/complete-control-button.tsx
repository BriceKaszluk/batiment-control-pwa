"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { completeControl } from "@/features/controls/services/local-controls";
import type { Control } from "@/types/domain";

type CompleteControlButtonProps = {
  control: Control;
  userId: string | null;
};

export function CompleteControlButton({
  control,
  userId,
}: Readonly<CompleteControlButtonProps>) {
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isCompleted = control.status === "completed";

  return (
    <div className="space-y-2">
      <Button
        className="h-12 w-full"
        disabled={!userId || isSaving || isCompleted}
        onClick={() => {
          setError(null);
          setIsSaving(true);

          void completeControl({
            controlId: control.id,
            userId,
          })
            .catch((error: unknown) => {
              setError(
                error instanceof Error ? error.message : "Controle non termine",
              );
            })
            .finally(() => {
              setIsSaving(false);
            });
        }}
        type="button"
      >
        {isSaving ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <CheckCircle2 aria-hidden="true" className="size-4" />
        )}
        {isCompleted ? "Controle termine" : "Terminer le controle"}
      </Button>

      {control.completedAt ? (
        <p className="text-center text-sm font-medium text-muted-foreground">
          Termine le {formatDateTime(control.completedAt)}
        </p>
      ) : null}
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
