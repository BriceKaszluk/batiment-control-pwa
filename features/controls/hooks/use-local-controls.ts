"use client";

import { liveQuery } from "dexie";
import { useEffect, useState } from "react";

import {
  listControlsForUser,
  type ListControlsForUserOptions,
  type LocalControlSummary,
} from "@/features/controls/services/local-controls";

type LocalControlsState = {
  controls: LocalControlSummary[];
  error: string | null;
  isLoading: boolean;
};

type UseLocalControlsOptions = Pick<
  ListControlsForUserOptions,
  "limit" | "userId"
>;

export function useLocalControls({
  limit,
  userId,
}: UseLocalControlsOptions): LocalControlsState {
  const [state, setState] = useState<LocalControlsState>({
    controls: [],
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    const subscription = liveQuery(() =>
      listControlsForUser({ limit, userId }),
    ).subscribe({
      error: (error: unknown) => {
        setState({
          controls: [],
          error: error instanceof Error ? error.message : "Erreur locale",
          isLoading: false,
        });
      },
      next: (controls) => {
        setState({
          controls,
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
