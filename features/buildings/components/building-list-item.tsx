"use client";

import {
  Building2,
  ChevronDown,
  Clock3,
  Gauge,
  MapPin,
  Pencil,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

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
import type {
  BuildingPriorityScore,
  BuildingPriorityScoreLevel,
} from "@/features/buildings/services/building-priority-score";
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

const scoreToneClasses: Record<BuildingPriorityScoreLevel, string> = {
  normal: "border-emerald-200 bg-emerald-50 text-emerald-900",
  priority: "border-orange-200 bg-orange-50 text-orange-900",
  urgent: "border-red-300 bg-red-50 text-red-800",
  watch: "border-amber-200 bg-amber-50 text-amber-900",
};

type BuildingListItemProps = {
  agent: Agent | null;
  building: Building;
  priorityScore: BuildingPriorityScore;
  userId: string | null;
};

export function BuildingListItem({
  agent,
  building,
  priorityScore,
  userId,
}: Readonly<BuildingListItemProps>) {
  const [isScoreOpen, setIsScoreOpen] = useState(false);
  const priorityTone = getBuildingPriorityTone(building.priorityLevel);
  const agentStatus = agent?.status ?? building.agentStatus;
  const agentName = agent?.name ?? building.assignedAgentName;
  const agentTone = getAgentStatusTone(agentStatus);

  return (
    <article className="surface-card p-4">
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
        <div className="flex shrink-0 items-start gap-2">
          <button
            aria-expanded={isScoreOpen}
            aria-label={`Voir le detail du score ${priorityScore.score}`}
            className={cn(
              "status-pill min-w-16 flex-col justify-center px-2 py-1 text-xs font-semibold transition-[background-color,border-color,color,transform] duration-200 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              scoreToneClasses[priorityScore.level],
            )}
            onClick={() => {
              setIsScoreOpen((currentValue) => !currentValue);
            }}
            type="button"
          >
            <span className="inline-flex items-center gap-1">
              <Gauge aria-hidden="true" className="size-3.5" />
              {priorityScore.score}
            </span>
            <span className="text-[0.7rem] leading-4">{priorityScore.label}</span>
          </button>
          <Button asChild className="size-10" size="icon" variant="outline">
            <Link aria-label="Modifier le batiment" href={`/batiments/${building.id}`}>
              <Pencil aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium">
        <span
          className={cn(
            "status-pill px-2 py-1",
            priorityToneClasses[priorityTone],
          )}
        >
          {getBuildingPriorityLabel(building.priorityLevel)}
        </span>
        <span className="status-pill gap-1 bg-muted px-2 py-1 text-muted-foreground">
          <Clock3 aria-hidden="true" className="size-3.5" />
          {building.lastControlAt ? "Controle deja realise" : "Jamais controle"}
        </span>
        {agentName ? (
          <span
            className={cn(
              "status-pill gap-1 px-2 py-1",
              agentToneClasses[agentTone],
            )}
          >
            <UserRound aria-hidden="true" className="size-3.5" />
            {agentName} - {getAgentStatusLabel(agentStatus)}
          </span>
        ) : null}
      </div>
      {isScoreOpen ? (
        <div className="motion-reveal mt-4 border-t pt-3">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold">
            <span>Score priorite</span>
            <span>{priorityScore.score}/100</span>
          </div>
          <div className="space-y-2">
            {priorityScore.factors.map((factor) => (
              <div
                className="grid grid-cols-[3.5rem_1fr] gap-2 text-sm"
                key={factor.key}
              >
                <span className="font-semibold text-foreground">
                  +{factor.points}
                </span>
                <span className="min-w-0 text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {factor.label}
                  </span>
                  {" : "}
                  {factor.description}
                </span>
              </div>
            ))}
          </div>
          <button
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary"
            onClick={() => {
              setIsScoreOpen(false);
            }}
            type="button"
          >
            Masquer
            <ChevronDown aria-hidden="true" className="size-4 rotate-180" />
          </button>
        </div>
      ) : null}
      <div className="mt-4">
        <StartControlButton building={building} userId={userId} />
      </div>
    </article>
  );
}
