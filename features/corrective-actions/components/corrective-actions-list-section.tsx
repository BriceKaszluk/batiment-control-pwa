"use client";

import { AlertTriangle, Loader2 } from "lucide-react";

import { CorrectiveActionListItem } from "@/features/corrective-actions/components/corrective-action-list-item";
import { useLocalCorrectiveActions } from "@/features/corrective-actions/hooks/use-local-corrective-actions";

type CorrectiveActionsListSectionProps = {
  userId: string | null;
};

export function CorrectiveActionsListSection({
  userId,
}: Readonly<CorrectiveActionsListSectionProps>) {
  const { actions, error, isLoading } = useLocalCorrectiveActions({ userId });

  if (isLoading) {
    return (
      <section className="flex min-h-32 items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
        <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" />
        Chargement local
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex min-h-32 items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700">
        <AlertTriangle aria-hidden="true" className="mr-2 size-4" />
        Reprises locales indisponibles
      </section>
    );
  }

  if (actions.length === 0) {
    return (
      <section className="flex min-h-32 items-center justify-center rounded-md border bg-muted px-4 text-center text-sm text-muted-foreground">
        Aucune reprise locale
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {actions.map((summary) => (
        <CorrectiveActionListItem
          action={summary.action}
          buildingName={summary.building?.name}
          key={summary.action.id}
          userId={userId}
        />
      ))}
    </section>
  );
}
