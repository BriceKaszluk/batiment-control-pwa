"use client";

import { liveQuery } from "dexie";
import { useEffect, useState } from "react";

import {
  listCorrectiveActionsForUser,
  type ListCorrectiveActionsForUserOptions,
  type LocalCorrectiveActionSummary,
} from "@/features/corrective-actions/services/local-corrective-actions";

type LocalCorrectiveActionsState = {
  actions: LocalCorrectiveActionSummary[];
  error: string | null;
  isLoading: boolean;
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
    const subscription = liveQuery(() =>
      listCorrectiveActionsForUser({ includeClosed, userId }),
    ).subscribe({
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

    return () => {
      subscription.unsubscribe();
    };
  }, [includeClosed, userId]);

  return state;
}
