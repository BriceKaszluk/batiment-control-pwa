"use client";

import { useEffect, useState } from "react";

import type {
  ListCorrectiveActionsForUserOptions,
  LocalCorrectiveActionSummary,
} from "@/features/corrective-actions/services/local-corrective-actions";

type LocalCorrectiveActionsState = {
  actions: LocalCorrectiveActionSummary[];
  error: string | null;
  isLoading: boolean;
};

type LiveQuerySubscription = {
  unsubscribe: () => void;
};

type UseLocalCorrectiveActionsOptions = Pick<
  ListCorrectiveActionsForUserOptions,
  "includeClosed" | "userId"
>;

export function useLocalCorrectiveActions({
  includeClosed,
  userId,
}: UseLocalCorrectiveActionsOptions): LocalCorrectiveActionsState {
  const [state, setState] = useState<LocalCorrectiveActionsState>({
    actions: [],
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
      import("@/features/corrective-actions/services/local-corrective-actions"),
    ])
      .then(([dexieModule, localCorrectiveActionsModule]) => {
        if (isCanceled) {
          return;
        }

        subscription = dexieModule
          .liveQuery(() =>
            localCorrectiveActionsModule.listCorrectiveActionsForUser({
              includeClosed,
              userId,
            }),
          )
          .subscribe({
            error: (error: unknown) => {
              setState({
                actions: [],
                error: error instanceof Error ? error.message : "Erreur locale",
                isLoading: false,
              });
            },
            next: (actions) => {
              setState({
                actions,
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
          actions: [],
          error: error instanceof Error ? error.message : "Erreur locale",
          isLoading: false,
        });
      });

    return () => {
      isCanceled = true;
      subscription?.unsubscribe();
    };
  }, [includeClosed, userId]);

  return state;
}
