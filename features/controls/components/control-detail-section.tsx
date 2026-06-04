"use client";

import { AlertTriangle, Building2, Loader2 } from "lucide-react";

import { ChecklistResultEditor } from "@/features/controls/components/checklist-result-editor";
import { CompleteControlButton } from "@/features/controls/components/complete-control-button";
import { ControlCommentEditor } from "@/features/controls/components/control-comment-editor";
import { ControlCorrectiveActionsSection } from "@/features/controls/components/control-corrective-actions-section";
import { ControlPhotosSection } from "@/features/controls/components/control-photos-section";
import { useLocalControlDetail } from "@/features/controls/hooks/use-local-control-detail";
import { getControlStatusLabel } from "@/features/controls/services/local-controls";

type ControlDetailSectionProps = {
  controlId: string;
  userId: string | null;
};

export function ControlDetailSection({
  controlId,
  userId,
}: Readonly<ControlDetailSectionProps>) {
  const { detail, error, isLoading } = useLocalControlDetail({
    controlId,
    userId,
  });

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
        Controle local indisponible
      </section>
    );
  }

  if (!detail) {
    return (
      <section className="flex min-h-32 items-center justify-center rounded-md border bg-muted px-4 text-center text-sm text-muted-foreground">
        Controle local introuvable
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-md border bg-muted p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2 text-base font-semibold">
            <Building2 aria-hidden="true" className="size-5 shrink-0 text-primary" />
            <span className="truncate">
              {detail.building?.name ?? "Batiment non disponible"}
            </span>
          </p>
          <span className="shrink-0 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            {getControlStatusLabel(detail.control.status)}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {detail.building?.address ?? "Adresse non renseignee"}
        </p>
      </div>

      <ControlCommentEditor control={detail.control} userId={userId} />

      <ControlPhotosSection
        controlId={detail.control.id}
        photos={detail.photos}
        userId={userId}
      />

      {detail.checklist.length === 0 ? (
        <div className="flex min-h-28 items-center justify-center rounded-md border bg-muted px-4 text-center text-sm text-muted-foreground">
          Aucune checklist locale
        </div>
      ) : (
        <div className="space-y-3">
          {detail.checklist.map((entry) => (
            <ChecklistResultEditor
              controlId={detail.control.id}
              entry={entry}
              key={entry.item.id}
              userId={userId}
            />
          ))}
        </div>
      )}

      <ControlCorrectiveActionsSection
        actions={detail.correctiveActions}
        buildingName={detail.building?.name}
        controlId={detail.control.id}
        userId={userId}
      />

      <CompleteControlButton control={detail.control} userId={userId} />
    </section>
  );
}
