"use client";

import { AlertTriangle, Loader2 } from "lucide-react";

import { ControlHistoryListItem } from "@/features/history/components/control-history-list-item";
import { useLocalControlHistory } from "@/features/history/hooks/use-local-control-history";

type ControlHistoryListSectionProps = {
  userId: string | null;
};

export function ControlHistoryListSection({
  userId,
}: Readonly<ControlHistoryListSectionProps>) {
  const { controls, error, isLoading } = useLocalControlHistory({ userId });

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
        Historique local indisponible
      </section>
    );
  }

  if (controls.length === 0) {
    return (
      <section className="flex min-h-32 items-center justify-center rounded-md border bg-muted px-4 text-center text-sm text-muted-foreground">
        Aucun controle termine localement
      </section>
    );
  }

  return (
    <section className="motion-list space-y-3">
      {controls.map((summary) => (
        <ControlHistoryListItem key={summary.control.id} summary={summary} />
      ))}
    </section>
  );
}
