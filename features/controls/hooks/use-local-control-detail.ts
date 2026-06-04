"use client";

import { useEffect, useState } from "react";

import type {
  GetLocalControlDetailOptions,
  LocalControlDetail,
} from "@/features/controls/services/local-control-detail";

type LocalControlDetailState = {
  detail: LocalControlDetail | null;
  error: string | null;
  isLoading: boolean;
};

type LiveQuerySubscription = {
  unsubscribe: () => void;
};

type UseLocalControlDetailOptions = Pick<
  GetLocalControlDetailOptions,
  "controlId" | "userId"
>;

export function useLocalControlDetail({
  controlId,
  userId,
}: UseLocalControlDetailOptions): LocalControlDetailState {
  const [state, setState] = useState<LocalControlDetailState>({
    detail: null,
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
      import("@/features/controls/services/local-control-detail"),
    ])
      .then(([dexieModule, localControlDetailModule]) => {
        if (isCanceled) {
          return;
        }

        subscription = dexieModule
          .liveQuery(() =>
            localControlDetailModule.getLocalControlDetail({
              controlId,
              userId,
            }),
          )
          .subscribe({
            error: (error: unknown) => {
              setState({
                detail: null,
                error: error instanceof Error ? error.message : "Erreur locale",
                isLoading: false,
              });
            },
            next: (detail) => {
              setState({
                detail,
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
          detail: null,
          error: error instanceof Error ? error.message : "Erreur locale",
          isLoading: false,
        });
      });

    return () => {
      isCanceled = true;
      subscription?.unsubscribe();
    };
  }, [controlId, userId]);

  return state;
}
