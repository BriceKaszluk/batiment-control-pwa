"use client";

import { Loader2, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CorrectiveActionListItem } from "@/features/corrective-actions/components/corrective-action-list-item";
import type { CorrectiveAction } from "@/types/domain";

const priorityOptions: Array<{
  label: string;
  value: CorrectiveAction["priority"];
}> = [
  { label: "Normale", value: "normal" },
  { label: "Haute", value: "high" },
  { label: "Basse", value: "low" },
];

type ControlCorrectiveActionsSectionProps = {
  actions: CorrectiveAction[];
  buildingName?: string;
  controlId: string;
  userId: string | null;
};

export function ControlCorrectiveActionsSection({
  actions,
  buildingName,
  controlId,
  userId,
}: Readonly<ControlCorrectiveActionsSectionProps>) {
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [priority, setPriority] =
    useState<CorrectiveAction["priority"]>("normal");
  const [title, setTitle] = useState("");
  const canSubmit = title.trim().length > 0 && !isSaving && Boolean(userId);

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Reprises a faire</h2>
        <p className="text-sm text-muted-foreground">
          Actions creees depuis ce controle.
        </p>
      </div>

      <form
        className="space-y-3 rounded-md border bg-background p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setIsSaving(true);

          void import(
            "@/features/corrective-actions/services/local-corrective-actions"
          )
            .then((localCorrectiveActionsModule) =>
              localCorrectiveActionsModule.createCorrectiveActionForControl({
                controlId,
                description,
                dueDate,
                priority,
                title,
                userId,
              }),
            )
            .then(() => {
              setDescription("");
              setDueDate("");
              setPriority("normal");
              setTitle("");
            })
            .catch((error: unknown) => {
              setError(
                error instanceof Error ? error.message : "Reprise non creee",
              );
            })
            .finally(() => {
              setIsSaving(false);
            });
        }}
      >
        <label className="block space-y-2 text-sm font-medium">
          <span>Titre</span>
          <input
            className="h-11 w-full rounded-md border bg-background px-3 text-base font-normal outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            maxLength={180}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            placeholder="Ex: Reprendre le hall"
            value={title}
          />
        </label>

        <label className="block space-y-2 text-sm font-medium">
          <span>Description</span>
          <textarea
            className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-base font-normal leading-6 outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            maxLength={2000}
            onChange={(event) => {
              setDescription(event.target.value);
            }}
            placeholder="Detail de l'action"
            value={description}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-2 text-sm font-medium">
            <span>Priorite</span>
            <select
              className="h-11 w-full rounded-md border bg-background px-3 text-base font-normal outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => {
                setPriority(event.target.value as CorrectiveAction["priority"]);
              }}
              value={priority}
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2 text-sm font-medium">
            <span>Echeance</span>
            <input
              className="h-11 w-full rounded-md border bg-background px-3 text-base font-normal outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => {
                setDueDate(event.target.value);
              }}
              type="date"
              value={dueDate}
            />
          </label>
        </div>

        <Button className="h-11 w-full" disabled={!canSubmit} type="submit">
          {isSaving ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Plus aria-hidden="true" className="size-4" />
          )}
          Ajouter
        </Button>

        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      </form>

      {actions.length === 0 ? (
        <div className="flex min-h-24 items-center justify-center rounded-md border bg-muted px-4 text-center text-sm text-muted-foreground">
          Aucune reprise locale
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map((action) => (
            <CorrectiveActionListItem
              action={action}
              buildingName={buildingName}
              key={action.id}
              userId={userId}
            />
          ))}
        </div>
      )}
    </section>
  );
}
