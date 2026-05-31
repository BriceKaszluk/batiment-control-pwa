import { Building2, ClipboardCheck, Clock3 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  getControlStatusLabel,
  type LocalControlSummary,
} from "@/features/controls/services/local-controls";

type ControlListItemProps = {
  summary: LocalControlSummary;
};

export function ControlListItem({ summary }: Readonly<ControlListItemProps>) {
  const { building, control } = summary;

  return (
    <article className="rounded-md border bg-background p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <ClipboardCheck
              aria-hidden="true"
              className="size-5 shrink-0 text-primary"
            />
            <h2 className="truncate text-base font-semibold">
              {building?.name ?? "Batiment non disponible"}
            </h2>
          </div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 aria-hidden="true" className="size-4 shrink-0" />
            {building?.address ?? "Adresse non renseignee"}
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
          {getControlStatusLabel(control.status)}
        </span>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Clock3 aria-hidden="true" className="size-3.5" />
        Demarre localement
      </p>
      <Button asChild className="mt-4 h-11 w-full">
        <Link href={`/controles/${control.id}`}>
          <ClipboardCheck aria-hidden="true" className="size-4" />
          Ouvrir
        </Link>
      </Button>
    </article>
  );
}
