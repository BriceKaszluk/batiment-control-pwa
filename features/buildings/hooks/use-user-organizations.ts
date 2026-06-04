"use client";

import { useEffect, useState } from "react";

import type { Organization } from "@/types/domain";

type LocalOrganizationsState = {
  error: string | null;
  isLoading: boolean;
  organizations: Organization[];
};

type LiveQuerySubscription = {
  unsubscribe: () => void;
};

export function useUserOrganizations(userId: string | null): LocalOrganizationsState {
  const [state, setState] = useState<LocalOrganizationsState>({
    error: null,
    isLoading: true,
    organizations: [],
  });
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparationError, setPreparationError] = useState<string | null>(null);

  useEffect(() => {
    setPreparationError(null);
  }, [userId]);

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
      import("@/lib/db/dexie"),
      import("@/features/buildings/services/personal-workspace"),
    ])
      .then(([dexieModule, databaseModule, personalWorkspaceModule]) => {
        if (isCanceled) {
          return;
        }

        subscription = dexieModule
          .liveQuery(() =>
            personalWorkspaceModule.listPersonalOrganizationsForUser({
              database: databaseModule.db,
              userId,
            }),
          )
          .subscribe({
            error: (error: unknown) => {
              setState({
                error: error instanceof Error ? error.message : "Erreur locale",
                isLoading: false,
                organizations: [],
              });
            },
            next: (organizations) => {
              setState({
                error: null,
                isLoading: false,
                organizations,
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
          organizations: [],
        });
      });

    return () => {
      isCanceled = true;
      subscription?.unsubscribe();
    };
  }, [userId]);

  useEffect(() => {
    if (
      !userId ||
      state.error ||
      state.isLoading ||
      state.organizations.length > 0 ||
      isPreparing ||
      preparationError
    ) {
      return;
    }

    let canceled = false;
    setIsPreparing(true);

    void Promise.all([
      import("@/lib/db/dexie"),
      import("@/features/buildings/services/personal-workspace"),
    ])
      .then(([databaseModule, personalWorkspaceModule]) =>
        personalWorkspaceModule.preparePersonalWorkspaceForUser({
          database: databaseModule.db,
          userId,
        }),
      )
      .catch((error: unknown) => {
        if (canceled) {
          return;
        }

        setPreparationError(
          error instanceof Error ? error.message : "Preparation locale impossible",
        );
      })
      .finally(() => {
        if (!canceled) {
          setIsPreparing(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [
    isPreparing,
    preparationError,
    state.error,
    state.isLoading,
    state.organizations.length,
    userId,
  ]);

  return {
    error: state.error ?? preparationError,
    isLoading: state.isLoading || isPreparing,
    organizations: state.organizations,
  };
}
