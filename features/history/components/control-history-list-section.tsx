"use client";

import { AlertTriangle, Loader2, Search, X } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ControlHistoryListItem } from "@/features/history/components/control-history-list-item";
import { useLocalControlHistory } from "@/features/history/hooks/use-local-control-history";

type ControlHistoryListSectionProps = {
  userId: string | null;
};

export function ControlHistoryListSection({
  userId,
}: Readonly<ControlHistoryListSectionProps>) {
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const hasSearchQuery = searchQuery.trim().length > 0;
  const { controls, error, isLoading } = useLocalControlHistory({
    searchQuery: deferredSearchQuery,
    userId,
  });

  useEffect(() => {
    if (isLoading || controls.length === 0 || !window.location.hash) {
      return;
    }

    const targetId = window.location.hash.slice(1);
    const targetElement = document.getElementById(targetId);

    targetElement?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [controls, isLoading]);

  const searchBar = (
    <div className="surface-panel p-3">
      <label className="block space-y-2 text-sm font-medium" htmlFor="history-search">
        <span>Rechercher un controle</span>
        <span className="relative block">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            autoComplete="off"
            className="h-11 w-full rounded-md border bg-background px-9 text-base font-normal outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            id="history-search"
            onChange={(event) => {
              setSearchQuery(event.target.value);
            }}
            placeholder="Batiment, adresse, secteur, date..."
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
  );

  if (isLoading) {
    return (
      <section className="space-y-3">
        {searchBar}
        <div className="flex min-h-32 items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
          <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" />
          Chargement local
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-3">
        {searchBar}
        <div className="flex min-h-32 items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700">
          <AlertTriangle aria-hidden="true" className="mr-2 size-4" />
          Historique local indisponible
        </div>
      </section>
    );
  }

  if (controls.length === 0) {
    return (
      <section className="space-y-3">
        {searchBar}
        <div className="flex min-h-32 items-center justify-center rounded-md border bg-muted px-4 text-center text-sm text-muted-foreground">
          {hasSearchQuery
            ? "Aucun controle ne correspond a la recherche"
            : "Aucun controle archive localement"}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {searchBar}
      <div className="motion-list space-y-3">
        {controls.map((summary) => (
          <ControlHistoryListItem key={summary.control.id} summary={summary} />
        ))}
      </div>
    </section>
  );
}
