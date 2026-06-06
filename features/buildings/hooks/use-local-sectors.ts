"use client";

import { useEffect, useState } from "react";

import type { ListBuildingSectorsForUserOptions } from "@/features/buildings/services/local-sectors";
import type { BuildingSector } from "@/types/domain";

type LocalSectorsState = {
  error: string | null;
  isLoading: boolean;
  sectors: BuildingSector[];
};

type LiveQuerySubscription = {
  unsubscribe: () => void;
};

type UseLocalSectorsOptions = Pick<
  ListBuildingSectorsForUserOptions,
  "organizationId" | "userId"
>;

export function useLocalSectors({
  organizationId,
  userId,
}: UseLocalSectorsOptions): LocalSectorsState {
  const [state, setState] = useState<LocalSectorsState>({
    error: null,
    isLoading: true,
    sectors: [],
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
      import("@/features/buildings/services/local-sectors"),
    ])
      .then(([dexieModule, localSectorsModule]) => {
        if (isCanceled) {
          return;
        }

        subscription = dexieModule
          .liveQuery(() =>
            localSectorsModule.listBuildingSectorsForUser({
              organizationId,
              userId,
            }),
          )
          .subscribe({
            error: (error: unknown) => {
              setState({
                error: error instanceof Error ? error.message : "Erreur locale",
                isLoading: false,
                sectors: [],
              });
            },
            next: (sectors) => {
              setState({
                error: null,
                isLoading: false,
                sectors,
              });
            },
          });
      })
      .catch((error: unknown) => {
        if (isCanceled) {
          return;
        }

        setState({
          error: error instanceof Error ? error.message : "Erreur locale",
          isLoading: false,
          sectors: [],
        });
      });

    return () => {
      isCanceled = true;
      subscription?.unsubscribe();
    };
  }, [organizationId, userId]);

  return state;
}
