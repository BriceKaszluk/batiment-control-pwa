"use client";

import { useEffect, useState } from "react";

import type { ListBuildingsForUserOptions } from "@/features/buildings/services/local-buildings";
import type { Building } from "@/types/domain";

type LocalBuildingsState = {
  buildings: Building[];
  error: string | null;
  isLoading: boolean;
};

type LiveQuerySubscription = {
  unsubscribe: () => void;
};

type UseLocalBuildingsOptions = Pick<
  ListBuildingsForUserOptions,
  "limit" | "userId"
>;

export function useLocalBuildings({
  limit,
  userId,
}: UseLocalBuildingsOptions): LocalBuildingsState {
  const [state, setState] = useState<LocalBuildingsState>({
    buildings: [],
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
            localBuildingsModule.listBuildingsForUser({ limit, userId }),
          )
          .subscribe({
            error: (error: unknown) => {
              setState({
                buildings: [],
                error: error instanceof Error ? error.message : "Erreur locale",
                isLoading: false,
              });
            },
            next: (buildings) => {
              setState({
                buildings,
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
          buildings: [],
          error: error instanceof Error ? error.message : "Erreur locale",
          isLoading: false,
        });
      });

    return () => {
      isCanceled = true;
      subscription?.unsubscribe();
    };
  }, [limit, userId]);

  return state;
}
