"use client";

import { useEffect, useState } from "react";

import type { ListBuildingsForUserOptions } from "@/features/buildings/services/local-buildings";
import type { BuildingListEntry } from "@/features/buildings/services/local-buildings";

type LocalBuildingsState = {
  entries: BuildingListEntry[];
  error: string | null;
  isLoading: boolean;
};

type LiveQuerySubscription = {
  unsubscribe: () => void;
};

type UseLocalBuildingsOptions = Pick<
  ListBuildingsForUserOptions,
  "limit" | "searchQuery" | "sectorName" | "userId"
>;

export function useLocalBuildings({
  limit,
  searchQuery,
  sectorName,
  userId,
}: UseLocalBuildingsOptions): LocalBuildingsState {
  const [state, setState] = useState<LocalBuildingsState>({
    entries: [],
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    let isCanceled = false;
    let subscription: LiveQuerySubscription | null = null;

    setState((currentState) => ({
      ...currentState,
      error: null,
      isLoading: true,
    }));

    void Promise.all([
      import("dexie"),
      import("@/features/buildings/services/local-buildings"),
    ])
      .then(([dexieModule, localBuildingsModule]) => {
        if (isCanceled) {
          return;
        }

        subscription = dexieModule
          .liveQuery(() =>
            localBuildingsModule.listBuildingEntriesForUser({
              limit,
              searchQuery,
              sectorName,
              userId,
            }),
          )
          .subscribe({
            error: (error: unknown) => {
              setState({
                entries: [],
                error: error instanceof Error ? error.message : "Erreur locale",
                isLoading: false,
              });
            },
            next: (entries) => {
              setState({
                entries,
                error: null,
                isLoading: false,
              });
            },
          });
      })
      .catch((error: unknown) => {
        if (isCanceled) {
          return;
        }

        setState({
          entries: [],
          error: error instanceof Error ? error.message : "Erreur locale",
          isLoading: false,
        });
      });

    return () => {
      isCanceled = true;
      subscription?.unsubscribe();
    };
  }, [limit, searchQuery, sectorName, userId]);

  return state;
}
