import { Building2, Clock3, MapPin, Pencil, UserRound } from "lucide-react";
import Link from "next/link";

import {
  getAgentStatusLabel,
  getAgentStatusTone,
  type AgentStatusTone,
} from "@/features/agents/services/agent-labels";
import {
  getBuildingPriorityLabel,
  getBuildingPriorityTone,
  type BuildingPriorityTone,
} from "@/features/buildings/services/building-labels";
import { StartControlButton } from "@/features/controls/components/start-control-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Agent, Building } from "@/types/domain";

const priorityToneClasses: Record<BuildingPriorityTone, string> = {
  critical: "border-red-300 bg-red-50 text-red-800",
  high: "border-amber-200 bg-amber-50 text-amber-900",
  low: "border-slate-200 bg-slate-50 text-slate-700",
  normal: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

const agentToneClasses: Record<AgentStatusTone, string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-900",
  away: "border-amber-200 bg-amber-50 text-amber-900",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
};

type BuildingListItemProps = {
  agent: Agent | null;
  building: Building;
  userId: string | null;
};

export function BuildingListItem({
  agent,
  building,
  userId,
}: Readonly<BuildingListItemProps>) {
  const priorityTone = getBuildingPriorityTone(building.priorityLevel);
  const agentStatus = agent?.status ?? building.agentStatus;
  const agentName = agent?.name ?? building.assignedAgentName;
  const agentTone = getAgentStatusTone(agentStatus);

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
              {building.address}
            </span>
          </p>
          <p className="text-sm font-medium text-muted-foreground">
            Secteur: {building.sector}
          </p>
        </div>
        <Button asChild className="size-10 shrink-0" size="icon" variant="outline">
          <Link aria-label="Modifier le batiment" href={`/batiments/${building.id}`}>
            <Pencil aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium">
        <span
          className={cn(
            "rounded-md border px-2 py-1",
            priorityToneClasses[priorityTone],
          )}
        >
          {getBuildingPriorityLabel(building.priorityLevel)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-muted-foreground">
          <Clock3 aria-hidden="true" className="size-3.5" />
          {building.lastControlAt ? "Controle deja realise" : "Jamais controle"}
        </span>
        {agentName ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-1",
              agentToneClasses[agentTone],
            )}
          >
            <UserRound aria-hidden="true" className="size-3.5" />
            {agentName} - {getAgentStatusLabel(agentStatus)}
          </span>
        ) : null}
      </div>
      <div className="mt-4">
        <StartControlButton building={building} userId={userId} />
      </div>
    </article>
  );
}
