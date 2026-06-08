"use client";

import type { BatimentControlDatabase } from "@/lib/db/schema";
import { db } from "@/lib/db/dexie";
import { saveLocalMutation } from "@/lib/sync/local-mutation";
import { agentCreateSchema, agentSchema } from "@/lib/validation/schemas";
import { listPersonalOrganizationsForUser } from "@/features/buildings/services/personal-workspace";
import { capitalizeWords } from "@/lib/text/capitalize-words";
import type { Agent, AgentCreateInput } from "@/types/domain";
import type { LocalMutationResult } from "@/types/sync";

export type ListAgentsForUserOptions = {
  database?: BatimentControlDatabase;
  organizationId?: string;
  userId: string | null;
};

export async function listAgentsForUser({
  database = db,
  organizationId,
  userId,
}: ListAgentsForUserOptions): Promise<Agent[]> {
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

  const agents = await database.agents
    .where("organizationId")
    .anyOf(organizationIds)
    .filter((agent) => agent.deletedAt === null)
    .toArray();

  return agents.sort((firstAgent, secondAgent) =>
    firstAgent.name.localeCompare(secondAgent.name, "fr"),
  );
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

export type CreateAgentOptions = {
  clientMutationId?: string;
  createId?: () => string;
  database?: BatimentControlDatabase;
  input: AgentCreateInput;
  now?: () => string;
  organizationId: string;
  userId: string | null;
};

export async function createAgent({
  clientMutationId,
  createId = () => crypto.randomUUID(),
  database = db,
  input,
  now = () => new Date().toISOString(),
  organizationId,
  userId,
}: CreateAgentOptions): Promise<LocalMutationResult<Agent>> {
  if (!userId) {
    throw new Error("Utilisateur requis pour creer un agent.");
  }

  const membership = await database.organizationMembers.get([organizationId, userId]);

  if (!membership) {
    throw new Error("Organisation locale non autorisee.");
  }

  const parsedInput = agentCreateSchema.parse(normalizeAgentInput(input));
  const timestamp = now();
  const agent = agentSchema.parse({
    ...parsedInput,
    createdAt: timestamp,
    createdBy: userId,
    deletedAt: null,
    id: createId(),
    organizationId,
    updatedAt: timestamp,
  });

  return saveLocalMutation({
    clientMutationId,
    createId,
    database,
    entity: "agents",
    now,
    record: agent,
    schema: agentSchema,
    table: database.agents,
  });
}

export type UpdateAgentOptions = {
  agentId: string;
  clientMutationId?: string;
  createId?: () => string;
  database?: BatimentControlDatabase;
  input: AgentCreateInput;
  now?: () => string;
  userId: string | null;
};

export async function updateAgent({
  agentId,
  clientMutationId,
  createId = () => crypto.randomUUID(),
  database = db,
  input,
  now = () => new Date().toISOString(),
  userId,
}: UpdateAgentOptions): Promise<LocalMutationResult<Agent>> {
  if (!userId) {
    throw new Error("Utilisateur requis pour modifier un agent.");
  }

  const existingAgent = await database.agents.get(agentId);

  if (!existingAgent || existingAgent.deletedAt !== null) {
    throw new Error("Agent local introuvable.");
  }

  const membership = await database.organizationMembers.get([
    existingAgent.organizationId,
    userId,
  ]);

  if (!membership) {
    throw new Error("Organisation locale non autorisee.");
  }

  const parsedInput = agentCreateSchema.parse(normalizeAgentInput(input));
  const updatedAgent = agentSchema.parse({
    ...existingAgent,
    ...parsedInput,
    updatedAt: now(),
  });

  return saveLocalMutation({
    clientMutationId,
    createId,
    database,
    entity: "agents",
    now,
    record: updatedAgent,
    schema: agentSchema,
    table: database.agents,
  });
}

function normalizeAgentInput(input: AgentCreateInput): AgentCreateInput {
  return {
    ...input,
    name: capitalizeWords(input.name),
  };
}
