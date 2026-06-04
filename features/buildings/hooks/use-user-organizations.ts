"use client";

import { liveQuery } from "dexie";
import { useEffect, useState } from "react";

import { db } from "@/lib/db/dexie";
import {
  listPersonalOrganizationsForUser,
  preparePersonalWorkspaceForUser,
} from "@/features/buildings/services/personal-workspace";
import type { Organization } from "@/types/domain";

type LocalOrganizationsState = {
  error: string | null;
  isLoading: boolean;
  organizations: Organization[];
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
    const subscription = liveQuery(() =>
      listPersonalOrganizationsForUser({ database: db, userId }),
    ).subscribe({
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

    return () => {
      subscription.unsubscribe();
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

    void preparePersonalWorkspaceForUser({ database: db, userId })
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
