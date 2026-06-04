"use client";

import { db } from "@/lib/db/dexie";
import type { BatimentControlDatabase } from "@/lib/db/schema";
import type { RemotePullAdapter } from "@/lib/sync/supabase-pull-adapter";
import type { Organization } from "@/types/domain";

type ListPersonalOrganizationsOptions = {
  database?: BatimentControlDatabase;
  userId: string | null;
};

type PreparePersonalWorkspaceOptions = ListPersonalOrganizationsOptions & {
  isOnline?: () => boolean;
  remote?: RemotePullAdapter;
};

export async function listPersonalOrganizationsForUser({
  database = db,
  userId,
}: ListPersonalOrganizationsOptions): Promise<Organization[]> {
  if (!userId) {
    return [];
  }

  const members = await database.organizationMembers
    .where("userId")
    .equals(userId)
    .toArray();
  const organizationIds = [
    ...new Set(members.map((member) => member.organizationId)),
  ];

  if (organizationIds.length === 0) {
    return [];
  }

  const organizations = await database.organizations.bulkGet(organizationIds);
  const visibleOrganizations = organizations.filter(
    (organization): organization is Organization => Boolean(organization),
  );
  const personalOrganizations = visibleOrganizations.filter(
    (organization) =>
      organization.ownerId === userId &&
      organization.workspaceType === "personal",
  );

  return personalOrganizations.length > 0
    ? personalOrganizations
    : visibleOrganizations;
}

export async function preparePersonalWorkspaceForUser({
  database = db,
  isOnline = () =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  remote,
  userId,
}: PreparePersonalWorkspaceOptions): Promise<Organization[]> {
  const existingOrganizations = await listPersonalOrganizationsForUser({
    database,
    userId,
  });

  if (existingOrganizations.length > 0) {
    return existingOrganizations;
  }

  if (!userId) {
    return [];
  }

  if (!isOnline()) {
    throw new Error(
      "Connexion requise pour preparer votre espace personnel initial.",
    );
  }

  const [remoteAdapter, { saveRemoteSnapshot }] = await Promise.all([
    remote ? Promise.resolve(remote) : createDefaultRemotePullAdapter(),
    import("@/lib/sync/remote-snapshot"),
  ]);
  const remoteSnapshot = await remoteAdapter.pullForUser(userId);
  await saveRemoteSnapshot(remoteSnapshot, database);

  const preparedOrganizations = await listPersonalOrganizationsForUser({
    database,
    userId,
  });

  if (preparedOrganizations.length === 0) {
    throw new Error("Espace personnel local indisponible apres synchronisation.");
  }

  return preparedOrganizations;
}

async function createDefaultRemotePullAdapter(): Promise<RemotePullAdapter> {
  const [supabaseClientModule, remotePullAdapterModule] = await Promise.all([
    import("@/lib/supabase/client"),
    import("@/lib/sync/supabase-pull-adapter"),
  ]);

  return remotePullAdapterModule.createSupabaseRemotePullAdapter(
    supabaseClientModule.createClient(),
  );
}
