"use client";

import { useEffect, useState } from "react";

import type {
  GetLocalDiagnosticsOptions,
  LocalDiagnostics,
} from "@/features/settings/services/local-diagnostics";

type LocalDiagnosticsState = {
  diagnostics: LocalDiagnostics | null;
  error: string | null;
  isLoading: boolean;
};

type LiveQuerySubscription = {
  unsubscribe: () => void;
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
    let isCanceled = false;
    let subscription: LiveQuerySubscription | null = null;

    setState((currentState) => ({
      ...currentState,
      error: null,
      isLoading: true,
    }));

    void Promise.all([
      import("dexie"),
      import("@/features/settings/services/local-diagnostics"),
    ])
      .then(([dexieModule, localDiagnosticsModule]) => {
        if (isCanceled) {
          return;
        }

        subscription = dexieModule
          .liveQuery(() => localDiagnosticsModule.getLocalDiagnostics({ userId }))
          .subscribe({
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
      })
      .catch((error: unknown) => {
        if (isCanceled) {
          return;
        }

        setState({
          diagnostics: null,
          error: error instanceof Error ? error.message : "Erreur locale",
          isLoading: false,
        });
      });

    return () => {
      isCanceled = true;
      subscription?.unsubscribe();
    };
  }, [userId]);

  return state;
}
