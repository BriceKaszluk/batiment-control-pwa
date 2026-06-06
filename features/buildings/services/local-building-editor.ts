"use client";

import type { BatimentControlDatabase } from "@/lib/db/schema";
import { db } from "@/lib/db/dexie";
import { saveLocalMutation } from "@/lib/sync/local-mutation";
import { buildingCreateSchema, buildingSchema } from "@/lib/validation/schemas";
import { ensureBuildingSector } from "@/features/buildings/services/local-sectors";
import type { Agent } from "@/types/domain";
import type { Building, BuildingCreateInput } from "@/types/domain";
import type { LocalMutationResult } from "@/types/sync";

export type GetLocalBuildingOptions = {
  buildingId: string;
  database?: BatimentControlDatabase;
  userId: string | null;
};

export async function getLocalBuilding({
  buildingId,
  database = db,
  userId,
}: GetLocalBuildingOptions): Promise<Building | null> {
  if (!userId) {
    return null;
  }

  const building = await database.buildings.get(buildingId);

  if (!building || building.deletedAt !== null) {
    return null;
  }

  const membership = await database.organizationMembers.get([
    building.organizationId,
    userId,
  ]);

  if (!membership) {
    return null;
  }

  return building;
}

export type CreateBuildingOptions = {
  clientMutationId?: string;
  createId?: () => string;
  database?: BatimentControlDatabase;
  input: BuildingCreateInput;
  now?: () => string;
  organizationId: string;
  userId: string | null;
};

export async function createBuilding({
  clientMutationId,
  createId = () => crypto.randomUUID(),
  database = db,
  input,
  now = () => new Date().toISOString(),
  organizationId,
  userId,
}: CreateBuildingOptions): Promise<LocalMutationResult<Building>> {
  if (!userId) {
    throw new Error("Utilisateur requis pour creer un batiment.");
  }

  const membership = await database.organizationMembers.get([organizationId, userId]);

  if (!membership) {
    throw new Error("Organisation locale non autorisee.");
  }

  const parsedBuildingInput = buildingCreateSchema.parse(input);
  await ensureBuildingSector({
    database,
    name: parsedBuildingInput.sector,
    organizationId,
    userId,
  });

  const parsedInput = await enrichBuildingInputWithAgent({
    database,
    input: parsedBuildingInput,
    organizationId,
  });
  const timestamp = now();
  const building: Building = buildingSchema.parse({
    ...parsedInput,
    createdAt: timestamp,
    createdBy: userId,
    deletedAt: null,
    id: createId(),
    lastControlAt: null,
    organizationId,
    updatedAt: timestamp,
  });

  return saveLocalMutation({
    clientMutationId,
    createId,
    database,
    entity: "buildings",
    now,
    record: building,
    schema: buildingSchema,
    table: database.buildings,
  });
}

export type UpdateBuildingOptions = {
  buildingId: string;
  clientMutationId?: string;
  createId?: () => string;
  database?: BatimentControlDatabase;
  input: BuildingCreateInput;
  now?: () => string;
  userId: string | null;
};

export async function updateBuilding({
  buildingId,
  clientMutationId,
  createId = () => crypto.randomUUID(),
  database = db,
  input,
  now = () => new Date().toISOString(),
  userId,
}: UpdateBuildingOptions): Promise<LocalMutationResult<Building>> {
  if (!userId) {
    throw new Error("Utilisateur requis pour modifier un batiment.");
  }

  const existingBuilding = await database.buildings.get(buildingId);

  if (!existingBuilding || existingBuilding.deletedAt !== null) {
    throw new Error("Batiment local introuvable.");
  }

  const membership = await database.organizationMembers.get([
    existingBuilding.organizationId,
    userId,
  ]);

  if (!membership) {
    throw new Error("Organisation locale non autorisee.");
  }

  const parsedBuildingInput = buildingCreateSchema.parse(input);
  await ensureBuildingSector({
    database,
    name: parsedBuildingInput.sector,
    organizationId: existingBuilding.organizationId,
    userId,
  });

  const parsedInput = await enrichBuildingInputWithAgent({
    database,
    input: parsedBuildingInput,
    organizationId: existingBuilding.organizationId,
  });
  const timestamp = now();
  const updatedBuilding: Building = buildingSchema.parse({
    ...existingBuilding,
    ...parsedInput,
    updatedAt: timestamp,
  });

  return saveLocalMutation({
    clientMutationId,
    createId,
    database,
    entity: "buildings",
    now,
    record: updatedBuilding,
    schema: buildingSchema,
    table: database.buildings,
  });
}

async function enrichBuildingInputWithAgent({
  database,
  input,
  organizationId,
}: {
  database: BatimentControlDatabase;
  input: BuildingCreateInput;
  organizationId: string;
}): Promise<BuildingCreateInput> {
  if (!input.assignedAgentId) {
    return input;
  }

  const agent = await database.agents.get(input.assignedAgentId);

  if (!isAssignableAgent(agent, organizationId)) {
    throw new Error("Agent local introuvable pour ce batiment.");
  }

  return {
    ...input,
    agentStatus: agent.status,
    assignedAgentName: agent.name,
  };
}

function isAssignableAgent(
  agent: Agent | undefined,
  organizationId: string,
): agent is Agent {
  return Boolean(
    agent &&
      agent.organizationId === organizationId &&
      agent.deletedAt === null,
  );
}

export type DeleteBuildingOptions = {
  buildingId: string;
  clientMutationId?: string;
  createId?: () => string;
  database?: BatimentControlDatabase;
  now?: () => string;
  userId: string | null;
};

export async function deleteBuilding({
  buildingId,
  clientMutationId,
  createId = () => crypto.randomUUID(),
  database = db,
  now = () => new Date().toISOString(),
  userId,
}: DeleteBuildingOptions): Promise<LocalMutationResult<Building>> {
  if (!userId) {
    throw new Error("Utilisateur requis pour supprimer un batiment.");
  }

  const existingBuilding = await database.buildings.get(buildingId);

  if (!existingBuilding || existingBuilding.deletedAt !== null) {
    throw new Error("Batiment local introuvable.");
  }

  const membership = await database.organizationMembers.get([
    existingBuilding.organizationId,
    userId,
  ]);

  if (!membership) {
    throw new Error("Organisation locale non autorisee.");
  }

  const timestamp = now();
  const deletedBuilding: Building = buildingSchema.parse({
    ...existingBuilding,
    deletedAt: timestamp,
    updatedAt: timestamp,
  });

  return saveLocalMutation({
    clientMutationId,
    createId,
    database,
    entity: "buildings",
    now,
    record: deletedBuilding,
    schema: buildingSchema,
    table: database.buildings,
  });
}
