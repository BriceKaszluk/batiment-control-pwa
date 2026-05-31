"use client";

import { AlertTriangle, Loader2 } from "lucide-react";

import { BuildingForm } from "@/features/buildings/components/building-form";
import { useLocalBuilding } from "@/features/buildings/hooks/use-local-building";

type BuildingEditorProps = {
  buildingId: string;
  userId: string | null;
};

export function BuildingEditor({ buildingId, userId }: Readonly<BuildingEditorProps>) {
  const { building, error, isLoading } = useLocalBuilding({ buildingId, userId });

  if (isLoading) {
    return (
      <div className="flex min-h-28 items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
        <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" />
        Chargement local
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-28 items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700">
        <AlertTriangle aria-hidden="true" className="mr-2 size-4" />
        Donnees locales indisponibles
      </div>
    );
  }

  if (!building) {
    return (
      <div className="flex min-h-28 items-center justify-center rounded-md border bg-muted px-4 text-center text-sm text-muted-foreground">
        Batiment introuvable en local
      </div>
    );
  }

  return <BuildingForm building={building} mode="edit" userId={userId} />;
}

