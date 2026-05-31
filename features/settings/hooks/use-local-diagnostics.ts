"use client";

import { liveQuery } from "dexie";
import { useEffect, useState } from "react";

import {
  getLocalDiagnostics,
  type GetLocalDiagnosticsOptions,
  type LocalDiagnostics,
} from "@/features/settings/services/local-diagnostics";

type LocalDiagnosticsState = {
  diagnostics: LocalDiagnostics | null;
  error: string | null;
  isLoading: boolean;
};

type UseLocalDiagnosticsOptions = Pick<GetLocalDiagnosticsOptions, "userId">;

export function useLocalDiagnostics({
  userId,
}: UseLocalDiagnosticsOptions): LocalDiagnosticsState {
  const [state, setState] = useState<LocalDiagnosticsState>({
    diagnostics: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    const subscription = liveQuery(() =>
      getLocalDiagnostics({ userId }),
    ).subscribe({
      error: (error: unknown) => {
        setState({
          diagnostics: null,
          error: error instanceof Error ? error.message : "Erreur locale",
          isLoading: false,
        });
      },
      next: (diagnostics) => {
        setState({
          diagnostics,
          error: null,
          isLoading: false,
        });
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  return state;
}
