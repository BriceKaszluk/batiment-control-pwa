"use client";

import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";

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
  const hydrationInFlightRef = useRef<string | null>(null);
  const lastHydrationKeyRef = useRef<string | null>(null);
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
              hydrateRemotePhotosOnce({
                controlId,
                detail,
                hydrationInFlightRef,
                lastHydrationKeyRef,
                userId,
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

function hydrateRemotePhotosOnce({
  controlId,
  detail,
  hydrationInFlightRef,
  lastHydrationKeyRef,
  userId,
}: {
  controlId: string;
  detail: LocalControlDetail | null;
  hydrationInFlightRef: MutableRefObject<string | null>;
  lastHydrationKeyRef: MutableRefObject<string | null>;
  userId: string | null;
}) {
  if (
    !detail ||
    !userId ||
    detail.control.photosPurgedAt !== null ||
    typeof navigator === "undefined" ||
    !navigator.onLine
  ) {
    return;
  }

  const hydrationKey = `${userId}:${controlId}:${detail.control.updatedAt}`;

  if (
    lastHydrationKeyRef.current === hydrationKey ||
    hydrationInFlightRef.current === hydrationKey
  ) {
    return;
  }

  hydrationInFlightRef.current = hydrationKey;

  void import("@/features/controls/services/remote-control-photos")
    .then((remoteControlPhotosModule) =>
      remoteControlPhotosModule.hydrateRemoteControlPhotos({
        controlId,
        userId,
      }),
    )
    .then(() => {
      lastHydrationKeyRef.current = hydrationKey;
    })
    .catch(() => {
      // The local control remains usable offline; remote photo hydration can retry later.
    })
    .finally(() => {
      hydrationInFlightRef.current = null;
    });
}
