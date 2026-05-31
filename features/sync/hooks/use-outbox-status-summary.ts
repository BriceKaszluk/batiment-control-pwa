"use client";

import { liveQuery } from "dexie";
import { useEffect, useState } from "react";

import { getOutboxStatusSummary } from "@/features/sync/services/outbox-summary";
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

export function useOutboxStatusSummary(): OutboxStatusSummaryState {
  const [state, setState] = useState<OutboxStatusSummaryState>({
    error: null,
    isLoading: true,
    summary: emptySummary,
  });

  useEffect(() => {
    const subscription = liveQuery(() => getOutboxStatusSummary()).subscribe({
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

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
