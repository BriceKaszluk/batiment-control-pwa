"use client";

import { liveQuery } from "dexie";
import { useEffect, useState } from "react";

import {
  listBuildingsForUser,
  type ListBuildingsForUserOptions,
} from "@/features/buildings/services/local-buildings";
import type { Building } from "@/types/domain";

type LocalBuildingsState = {
  buildings: Building[];
  error: string | null;
  isLoading: boolean;
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
    const subscription = liveQuery(() =>
      listBuildingsForUser({ limit, userId }),
    ).subscribe({
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

    return () => {
      subscription.unsubscribe();
    };
  }, [limit, userId]);

  return state;
}
