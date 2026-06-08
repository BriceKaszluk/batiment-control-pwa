"use client";

import type { BatimentControlDatabase } from "@/lib/db/schema";
import { db } from "@/lib/db/dexie";
import { saveLocalMutation } from "@/lib/sync/local-mutation";
import {
  buildingSectorCreateSchema,
  buildingSectorSchema,
} from "@/lib/validation/schemas";
import { listPersonalOrganizationsForUser } from "@/features/buildings/services/personal-workspace";
import { capitalizeWords } from "@/lib/text/capitalize-words";
import type { BuildingSector } from "@/types/domain";
import type { LocalMutationResult } from "@/types/sync";

export type ListBuildingSectorsForUserOptions = {
  database?: BatimentControlDatabase;
  organizationId?: string;
  userId: string | null;
};

export async function listBuildingSectorsForUser({
  database = db,
  organizationId,
  userId,
}: ListBuildingSectorsForUserOptions): Promise<BuildingSector[]> {
  if (!userId) {
    return [];
  }

  const organizationIds = organizationId
    ? await getAuthorizedOrganizationIds({
        database,
        organizationId,
        userId,
      })
    : (
        await listPersonalOrganizationsForUser({
          database,
          userId,
        })
      ).map((organization) => organization.id);

  if (organizationIds.length === 0) {
    return [];
  }

  const sectors = await database.buildingSectors
    .where("organizationId")
    .anyOf(organizationIds)
    .filter((sector) => sector.deletedAt === null)
    .toArray();

  return dedupeAndSortSectors(sectors);
}

export type EnsureBuildingSectorOptions = {
  clientMutationId?: string;
  createId?: () => string;
  database?: BatimentControlDatabase;
  name: string;
  now?: () => string;
  organizationId: string;
  userId: string | null;
};

export async function ensureBuildingSector({
  clientMutationId,
  createId = () => crypto.randomUUID(),
  database = db,
  name,
  now = () => new Date().toISOString(),
  organizationId,
  userId,
}: EnsureBuildingSectorOptions): Promise<BuildingSector> {
  if (!userId) {
    throw new Error("Utilisateur requis pour enregistrer un secteur.");
  }

  const membership = await database.organizationMembers.get([organizationId, userId]);

  if (!membership) {
    throw new Error("Organisation locale non autorisee.");
  }

  const parsedInput = buildingSectorCreateSchema.parse({
    name: capitalizeWords(name),
  });
  const existingSector = await findBuildingSectorByName({
    database,
    name: parsedInput.name,
    organizationId,
  });

  if (existingSector && existingSector.deletedAt === null) {
    return existingSector;
  }

  const timestamp = now();
  const sector = buildingSectorSchema.parse({
    createdAt: existingSector?.createdAt ?? timestamp,
    createdBy: existingSector?.createdBy ?? userId,
    deletedAt: null,
    id: existingSector?.id ?? createId(),
    name: parsedInput.name,
    organizationId,
    updatedAt: timestamp,
  });

  const result = await saveLocalMutation({
    clientMutationId,
    createId,
    database,
    entity: "buildingSectors",
    now,
    record: sector,
    schema: buildingSectorSchema,
    table: database.buildingSectors,
  });

  return result.record;
}

export type DeleteBuildingSectorOptions = {
  clientMutationId?: string;
  createId?: () => string;
  database?: BatimentControlDatabase;
  now?: () => string;
  sectorId: string;
  userId: string | null;
};

export async function deleteBuildingSector({
  clientMutationId,
  createId = () => crypto.randomUUID(),
  database = db,
  now = () => new Date().toISOString(),
  sectorId,
  userId,
}: DeleteBuildingSectorOptions): Promise<LocalMutationResult<BuildingSector>> {
  if (!userId) {
    throw new Error("Utilisateur requis pour supprimer un secteur.");
  }

  const existingSector = await database.buildingSectors.get(sectorId);

  if (!existingSector || existingSector.deletedAt !== null) {
    throw new Error("Secteur local introuvable.");
  }

  const membership = await database.organizationMembers.get([
    existingSector.organizationId,
    userId,
  ]);

  if (!membership) {
    throw new Error("Organisation locale non autorisee.");
  }

  const timestamp = now();
  const deletedSector = buildingSectorSchema.parse({
    ...existingSector,
    deletedAt: timestamp,
    updatedAt: timestamp,
  });

  return saveLocalMutation({
    clientMutationId,
    createId,
    database,
    entity: "buildingSectors",
    now,
    record: deletedSector,
    schema: buildingSectorSchema,
    table: database.buildingSectors,
  });
}

async function getAuthorizedOrganizationIds({
  database,
  organizationId,
  userId,
}: {
  database: BatimentControlDatabase;
  organizationId: string;
  userId: string;
}) {
  const membership = await database.organizationMembers.get([organizationId, userId]);

  return membership ? [organizationId] : [];
}

async function findBuildingSectorByName({
  database,
  name,
  organizationId,
}: {
  database: BatimentControlDatabase;
  name: string;
  organizationId: string;
}) {
  const normalizedName = normalizeSectorName(name);

  return database.buildingSectors
    .where("organizationId")
    .equals(organizationId)
    .filter((sector) => normalizeSectorName(sector.name) === normalizedName)
    .first();
}

function dedupeAndSortSectors(sectors: readonly BuildingSector[]) {
  const sectorByName = new Map<string, BuildingSector>();

  for (const sector of sectors) {
    sectorByName.set(normalizeSectorName(sector.name), sector);
  }

  return [...sectorByName.values()].sort((firstSector, secondSector) =>
    firstSector.name.localeCompare(secondSector.name, "fr"),
  );
}

function normalizeSectorName(name: string) {
  return name.trim().toLocaleLowerCase("fr");
}
