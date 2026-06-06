"use client";

import { useEffect, useState } from "react";

import type { ListAgentsForUserOptions } from "@/features/agents/services/local-agents";
import type { Agent } from "@/types/domain";

type LocalAgentsState = {
  agents: Agent[];
  error: string | null;
  isLoading: boolean;
};

type LiveQuerySubscription = {
  unsubscribe: () => void;
};

type UseLocalAgentsOptions = Pick<
  ListAgentsForUserOptions,
  "organizationId" | "userId"
>;

export function useLocalAgents({
  organizationId,
  userId,
}: UseLocalAgentsOptions): LocalAgentsState {
  const [state, setState] = useState<LocalAgentsState>({
    agents: [],
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
      import("@/features/agents/services/local-agents"),
    ])
      .then(([dexieModule, localAgentsModule]) => {
        if (isCanceled) {
          return;
        }

        subscription = dexieModule
          .liveQuery(() =>
            localAgentsModule.listAgentsForUser({
              organizationId,
              userId,
            }),
          )
          .subscribe({
            error: (error: unknown) => {
              setState({
                agents: [],
                error: error instanceof Error ? error.message : "Erreur locale",
                isLoading: false,
              });
            },
            next: (agents) => {
              setState({
                agents,
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
          agents: [],
          error: error instanceof Error ? error.message : "Erreur locale",
          isLoading: false,
        });
      });

    return () => {
      isCanceled = true;
      subscription?.unsubscribe();
    };
  }, [organizationId, userId]);

  return state;
}
