"use client";

import { liveQuery } from "dexie";
import { useEffect, useState } from "react";

import { db } from "@/lib/db/dexie";
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

  useEffect(() => {
    const subscription = liveQuery(async () => {
      if (!userId) {
        return [];
      }

      const members = await db.organizationMembers.where("userId").equals(userId).toArray();
      const organizationIds = [...new Set(members.map((member) => member.organizationId))];

      if (organizationIds.length === 0) {
        return [];
      }

      const organizations = await db.organizations.bulkGet(organizationIds);

      return organizations.filter((org): org is Organization => Boolean(org));
    }).subscribe({
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

  return state;
}

