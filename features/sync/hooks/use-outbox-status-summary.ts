"use client";

import { useEffect, useState } from "react";

import type { OutboxStatusSummary } from "@/types/sync";

const emptySummary: OutboxStatusSummary = {
  error: 0,
  pending: 0,
  processing: 0,
  synced: 0,
};

type OutboxStatusSummaryState = {
  error: string | null;
  isLoading: boolean;
  summary: OutboxStatusSummary;
};

type LiveQuerySubscription = {
  unsubscribe: () => void;
};

export function useOutboxStatusSummary(): OutboxStatusSummaryState {
  const [state, setState] = useState<OutboxStatusSummaryState>({
    error: null,
    isLoading: true,
    summary: emptySummary,
  });

  useEffect(() => {
    let isCanceled = false;
    let subscription: LiveQuerySubscription | null = null;

    void Promise.all([
      import("dexie"),
      import("@/features/sync/services/outbox-summary"),
    ])
      .then(([dexieModule, outboxSummaryModule]) => {
        if (isCanceled) {
          return;
        }

        subscription = dexieModule
          .liveQuery(() => outboxSummaryModule.getOutboxStatusSummary())
          .subscribe({
            error: (error: unknown) => {
              setState((currentState) => ({
                ...currentState,
                error: error instanceof Error ? error.message : "Erreur locale",
                isLoading: false,
              }));
            },
            next: (summary) => {
              setState({
                error: null,
                isLoading: false,
                summary,
              });
            },
          });
      })
      .catch((error: unknown) => {
        if (isCanceled) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          error: error instanceof Error ? error.message : "Erreur locale",
          isLoading: false,
        }));
      });

    return () => {
      isCanceled = true;
      subscription?.unsubscribe();
    };
  }, []);

  return state;
}
