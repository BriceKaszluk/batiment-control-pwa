"use client";

import { AlertTriangle, Loader2, Search, X } from "lucide-react";
import { useDeferredValue, useState } from "react";

import { BuildingListItem } from "@/features/buildings/components/building-list-item";
import { useLocalBuildings } from "@/features/buildings/hooks/use-local-buildings";
import { Button } from "@/components/ui/button";

type BuildingsListSectionProps = {
  enableSearch?: boolean;
  limit?: number;
  sectorName?: string | null;
  title: string;
  userId: string | null;
};

export function BuildingsListSection({
  enableSearch = false,
  limit,
  sectorName,
  title,
  userId,
}: Readonly<BuildingsListSectionProps>) {
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const hasSearchQuery = searchQuery.trim().length > 0;
  const { entries, error, isLoading } = useLocalBuildings({
    limit,
    searchQuery: enableSearch ? deferredSearchQuery : null,
    sectorName,
    userId,
  });
  const searchBar = enableSearch ? (
    <div className="surface-panel p-3">
      <label className="block space-y-2 text-sm font-medium" htmlFor="building-search">
        <span>Rechercher un batiment</span>
        <span className="relative block">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            autoComplete="off"
            className="h-11 w-full rounded-md border bg-background px-9 text-base font-normal outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            id="building-search"
            onChange={(event) => {
              setSearchQuery(event.target.value);
            }}
            placeholder="Nom, adresse, secteur, agent..."
            type="search"
            value={searchQuery}
          />
          {hasSearchQuery ? (
            <Button
              aria-label="Effacer la recherche"
              className="absolute right-1 top-1/2 size-9 -translate-y-1/2"
              onClick={() => {
                setSearchQuery("");
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          ) : null}
        </span>
      </label>
    </div>
  ) : null;

  if (isLoading) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {searchBar}
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
        {searchBar}
        <div className="flex min-h-28 items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700">
          <AlertTriangle aria-hidden="true" className="mr-2 size-4" />
          Donnees locales indisponibles
        </div>
      </section>
    );
  }

  if (entries.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {searchBar}
        <div className="flex min-h-28 items-center justify-center rounded-md border bg-muted px-4 text-center text-sm text-muted-foreground">
          {hasSearchQuery
            ? "Aucun batiment ne correspond a la recherche"
            : "Aucun batiment local"}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm font-medium text-muted-foreground">
          {entries.length}
        </p>
      </div>
      {searchBar}
      <div className="motion-list space-y-3">
        {entries.map(({ agent, building, priorityScore }) => (
          <BuildingListItem
            agent={agent}
            building={building}
            key={building.id}
            priorityScore={priorityScore}
            userId={userId}
          />
        ))}
      </div>
    </section>
  );
}
