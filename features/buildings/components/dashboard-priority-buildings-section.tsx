"use client";

import { MapPinned } from "lucide-react";
import { useState } from "react";

import { BuildingsListSection } from "@/features/buildings/components/buildings-list-section";
import { useLocalSectors } from "@/features/buildings/hooks/use-local-sectors";

type DashboardPriorityBuildingsSectionProps = {
  userId: string | null;
};

export function DashboardPriorityBuildingsSection({
  userId,
}: Readonly<DashboardPriorityBuildingsSectionProps>) {
  const [selectedSectorName, setSelectedSectorName] = useState<string>("");
  const { sectors } = useLocalSectors({
    organizationId: undefined,
    userId,
  });
  const normalizedSectorName = selectedSectorName || null;

  return (
    <section className="space-y-4">
      {sectors.length > 0 ? (
        <label className="surface-panel block space-y-2 p-3 text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            <MapPinned aria-hidden="true" className="size-4 text-primary" />
            Secteur
          </span>
          <select
            className="h-11 w-full rounded-md border bg-background px-3 text-base font-normal outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => {
              setSelectedSectorName(event.target.value);
            }}
            value={selectedSectorName}
          >
            <option value="">Tous les secteurs</option>
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.name}>
                {sector.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <BuildingsListSection
        limit={5}
        sectorName={normalizedSectorName}
        title={
          normalizedSectorName
            ? `Priorites - ${normalizedSectorName}`
            : "Batiments prioritaires"
        }
        userId={userId}
      />
    </section>
  );
}
