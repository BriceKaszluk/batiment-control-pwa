"use client";

import { AlertTriangle, Loader2 } from "lucide-react";

import { BuildingListItem } from "@/features/buildings/components/building-list-item";
import { useLocalBuildings } from "@/features/buildings/hooks/use-local-buildings";

type BuildingsListSectionProps = {
  limit?: number;
  title: string;
  userId: string | null;
};

export function BuildingsListSection({
  limit,
  title,
  userId,
}: Readonly<BuildingsListSectionProps>) {
  const { buildings, error, isLoading } = useLocalBuildings({ limit, userId });

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
          Donnees locales indisponibles
        </div>
      </section>
    );
  }

  if (buildings.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex min-h-28 items-center justify-center rounded-md border bg-muted px-4 text-center text-sm text-muted-foreground">
          Aucun batiment local
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm font-medium text-muted-foreground">
          {buildings.length}
        </p>
      </div>
      <div className="space-y-3">
        {buildings.map((building) => (
          <BuildingListItem building={building} key={building.id} />
        ))}
      </div>
    </section>
  );
}
