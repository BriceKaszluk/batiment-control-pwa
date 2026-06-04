"use client";

import { useEffect, useState } from "react";

import type {
  ListControlHistoryForUserOptions,
  LocalControlHistorySummary,
} from "@/features/controls/services/local-controls";

type LocalControlHistoryState = {
  controls: LocalControlHistorySummary[];
  error: string | null;
  isLoading: boolean;
};

type LiveQuerySubscription = {
  unsubscribe: () => void;
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
    let isCanceled = false;
    let subscription: LiveQuerySubscription | null = null;

    setState((currentState) => ({
      ...currentState,
      error: null,
      isLoading: true,
    }));

    void Promise.all([
      import("dexie"),
      import("@/features/controls/services/local-controls"),
    ])
      .then(([dexieModule, localControlsModule]) => {
        if (isCanceled) {
          return;
        }

        subscription = dexieModule
          .liveQuery(() =>
            localControlsModule.listControlHistoryForUser({ limit, userId }),
          )
          .subscribe({
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
      })
      .catch((error: unknown) => {
        if (isCanceled) {
          return;
        }

        setState({
          controls: [],
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
