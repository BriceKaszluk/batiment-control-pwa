"use client";

import { liveQuery } from "dexie";
import { useEffect, useState } from "react";

import {
  getLocalBuilding,
  type GetLocalBuildingOptions,
} from "@/features/buildings/services/local-building-editor";
import type { Building } from "@/types/domain";

type LocalBuildingState = {
  building: Building | null;
  error: string | null;
  isLoading: boolean;
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
    const subscription = liveQuery(() =>
      getLocalBuilding({ buildingId, userId }),
    ).subscribe({
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

    return () => {
      subscription.unsubscribe();
    };
  }, [buildingId, userId]);

  return state;
}

