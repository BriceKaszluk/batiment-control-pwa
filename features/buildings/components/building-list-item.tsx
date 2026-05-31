import { Building2, Clock3, MapPin } from "lucide-react";

import {
  getBuildingPriorityLabel,
  getBuildingPriorityTone,
  type BuildingPriorityTone,
} from "@/features/buildings/services/local-buildings";
import { cn } from "@/lib/utils";
import type { Building } from "@/types/domain";

const priorityToneClasses: Record<BuildingPriorityTone, string> = {
  high: "border-red-200 bg-red-50 text-red-700",
  low: "border-slate-200 bg-slate-50 text-slate-700",
  normal: "border-amber-200 bg-amber-50 text-amber-800",
};

type BuildingListItemProps = {
  building: Building;
};

export function BuildingListItem({
  building,
}: Readonly<BuildingListItemProps>) {
  const priorityTone = getBuildingPriorityTone(building.priorityScore);

  return (
    <article className="rounded-md border bg-background p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <Building2 aria-hidden="true" className="size-5 shrink-0 text-primary" />
            <h2 className="truncate text-base font-semibold">{building.name}</h2>
          </div>
          <p className="flex items-start gap-2 text-sm leading-5 text-muted-foreground">
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 break-words">
              {building.address ?? "Adresse non renseignee"}
            </span>
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md border px-2 py-1 text-xs font-medium",
            priorityToneClasses[priorityTone],
          )}
        >
          {building.priorityScore}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium">
        <span
          className={cn(
            "rounded-md border px-2 py-1",
            priorityToneClasses[priorityTone],
          )}
        >
          {getBuildingPriorityLabel(building.priorityScore)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-muted-foreground">
          <Clock3 aria-hidden="true" className="size-3.5" />
          {building.lastControlAt ? "Controle deja realise" : "Jamais controle"}
        </span>
      </div>
    </article>
  );
}
