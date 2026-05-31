"use client";

import { AlertTriangle, Loader2 } from "lucide-react";

import { ControlListItem } from "@/features/controls/components/control-list-item";
import { useLocalControls } from "@/features/controls/hooks/use-local-controls";

type ControlsListSectionProps = {
  title: string;
  userId: string | null;
};

export function ControlsListSection({
  title,
  userId,
}: Readonly<ControlsListSectionProps>) {
  const { controls, error, isLoading } = useLocalControls({ userId });

  if (isLoading) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex min-h-28 items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
          <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" />
          Chargement local
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex min-h-28 items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700">
          <AlertTriangle aria-hidden="true" className="mr-2 size-4" />
          Controles locaux indisponibles
        </div>
      </section>
    );
  }

  if (controls.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex min-h-28 items-center justify-center rounded-md border bg-muted px-4 text-center text-sm text-muted-foreground">
          Aucun controle local
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm font-medium text-muted-foreground">
          {controls.length}
        </p>
      </div>
      <div className="space-y-3">
        {controls.map((summary) => (
          <ControlListItem key={summary.control.id} summary={summary} />
        ))}
      </div>
    </section>
  );
}
