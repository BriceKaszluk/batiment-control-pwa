"use client";

import { liveQuery } from "dexie";
import { useEffect, useState } from "react";

import {
  listControlHistoryForUser,
  type ListControlHistoryForUserOptions,
  type LocalControlHistorySummary,
} from "@/features/controls/services/local-controls";

type LocalControlHistoryState = {
  controls: LocalControlHistorySummary[];
  error: string | null;
  isLoading: boolean;
};

type UseLocalControlHistoryOptions = Pick<
  ListControlHistoryForUserOptions,
  "limit" | "userId"
>;

export function useLocalControlHistory({
  limit,
  userId,
}: UseLocalControlHistoryOptions): LocalControlHistoryState {
  const [state, setState] = useState<LocalControlHistoryState>({
    controls: [],
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    const subscription = liveQuery(() =>
      listControlHistoryForUser({ limit, userId }),
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
