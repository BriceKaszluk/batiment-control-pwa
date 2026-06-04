"use client";

import { useEffect, useState } from "react";

import type { GetLocalBuildingOptions } from "@/features/buildings/services/local-building-editor";
import type { Building } from "@/types/domain";

type LocalBuildingState = {
  building: Building | null;
  error: string | null;
  isLoading: boolean;
};

type LiveQuerySubscription = {
  unsubscribe: () => void;
};

type UseLocalBuildingOptions = Pick<GetLocalBuildingOptions, "buildingId" | "userId">;

export function useLocalBuilding({
  buildingId,
  userId,
}: UseLocalBuildingOptions): LocalBuildingState {
  const [state, setState] = useState<LocalBuildingState>({
    building: null,
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
      import("@/features/buildings/services/local-building-editor"),
    ])
      .then(([dexieModule, localBuildingEditorModule]) => {
        if (isCanceled) {
          return;
        }

        subscription = dexieModule
          .liveQuery(() =>
            localBuildingEditorModule.getLocalBuilding({ buildingId, userId }),
          )
          .subscribe({
            error: (error: unknown) => {
              setState({
                building: null,
                error: error instanceof Error ? error.message : "Erreur locale",
                isLoading: false,
              });
            },
            next: (building) => {
              setState({
                building,
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
          building: null,
          error: error instanceof Error ? error.message : "Erreur locale",
          isLoading: false,
        });
      });

    return () => {
      isCanceled = true;
      subscription?.unsubscribe();
    };
  }, [buildingId, userId]);

  return state;
}
