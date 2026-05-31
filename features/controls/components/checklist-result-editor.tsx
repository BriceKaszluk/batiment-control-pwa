"use client";

import { Check, Loader2, MinusCircle, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  getChecklistResultStatusLabel,
  saveChecklistResult,
  type LocalChecklistEntry,
} from "@/features/controls/services/local-control-detail";
import type { ChecklistResult } from "@/types/domain";

const statusOptions: Array<{
  icon: typeof Check;
  label: string;
  status: ChecklistResult["status"];
}> = [
  { icon: Check, label: "Conforme", status: "compliant" },
  { icon: X, label: "Non conforme", status: "non_compliant" },
  { icon: MinusCircle, label: "N/A", status: "not_applicable" },
];

type ChecklistResultEditorProps = {
  controlId: string;
  entry: LocalChecklistEntry;
  userId: string | null;
};

export function ChecklistResultEditor({
  controlId,
  entry,
  userId,
}: Readonly<ChecklistResultEditorProps>) {
  const [comment, setComment] = useState(entry.result?.comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<
    ChecklistResult["status"] | null
  >(null);
  const selectedStatus = entry.result?.status ?? null;

  return (
    <article className="space-y-4 rounded-md border bg-background p-4 shadow-sm">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold">{entry.item.label}</h2>
          {entry.item.isRequired ? (
            <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              Requis
            </span>
          ) : null}
        </div>
        {entry.item.description ? (
          <p className="text-sm leading-5 text-muted-foreground">
            {entry.item.description}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {statusOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedStatus === option.status;
          const isSaving = savingStatus === option.status;

          return (
            <Button
              className="h-11 px-2 text-xs"
              disabled={!userId || savingStatus !== null}
              key={option.status}
              onClick={() => {
                setError(null);
                setSavingStatus(option.status);

                void saveChecklistResult({
                  checklistItemId: entry.item.id,
                  comment,
                  controlId,
                  status: option.status,
                  userId,
                })
                  .catch((error: unknown) => {
                    setError(
                      error instanceof Error
                        ? error.message
                        : "Reponse non enregistree",
                    );
                  })
                  .finally(() => {
                    setSavingStatus(null);
                  });
              }}
              type="button"
              variant={isSelected ? "default" : "outline"}
            >
              {isSaving ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Icon aria-hidden="true" className="size-4" />
              )}
              {option.label}
            </Button>
          );
        })}
      </div>

      <label className="block space-y-2 text-sm font-medium">
        <span>Commentaire</span>
        <textarea
          className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-base font-normal leading-6 outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          maxLength={2000}
          onChange={(event) => {
            setComment(event.target.value);
          }}
          placeholder="Note terrain"
          value={comment}
        />
      </label>

      {selectedStatus ? (
        <p className="text-sm font-medium text-muted-foreground">
          {getChecklistResultStatusLabel(selectedStatus)}
        </p>
      ) : null}
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </article>
  );
}
