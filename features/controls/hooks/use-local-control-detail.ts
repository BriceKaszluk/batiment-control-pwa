"use client";

import { liveQuery } from "dexie";
import { useEffect, useState } from "react";

import {
  getLocalControlDetail,
  type GetLocalControlDetailOptions,
  type LocalControlDetail,
} from "@/features/controls/services/local-control-detail";

type LocalControlDetailState = {
  detail: LocalControlDetail | null;
  error: string | null;
  isLoading: boolean;
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
    const subscription = liveQuery(() =>
      getLocalControlDetail({ controlId, userId }),
    ).subscribe({
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

    return () => {
      subscription.unsubscribe();
    };
  }, [controlId, userId]);

  return state;
}
