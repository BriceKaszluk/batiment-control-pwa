import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createBuilding,
  deleteBuilding,
  updateBuilding,
} from "@/features/buildings/services/local-building-editor";
import { BatimentControlDatabase } from "@/lib/db/schema";
import type { Agent, OrganizationMember } from "@/types/domain";

const now = "2026-05-31T00:00:00.000Z";
const later = "2026-05-31T01:00:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";
const mutationId = "44444444-4444-4444-8444-444444444444";
const operationId = "55555555-5555-4555-8555-555555555555";
const secondMutationId = "66666666-6666-4666-8666-666666666666";
const secondOperationId = "77777777-7777-4777-8777-777777777777";

function createTestDatabase() {
  return new BatimentControlDatabase(
    `batiment-control-local-building-editor-test-${Date.now()}-${Math.random()}`,
  );
}

function createIdFactory(ids: readonly string[]) {
  let index = 0;

  return () => {
    const id = ids[index];
    index += 1;

    if (!id) {
      throw new Error("No test id available.");
    }

    return id;
  };
}

const organizationMember: OrganizationMember = {
  createdAt: now,
  organizationId,
  role: "team_lead",
  userId,
};

const agent: Agent = {
  createdAt: now,
  createdBy: userId,
  deletedAt: null,
  id: "99999999-9999-4999-8999-999999999999",
  name: "Agent A",
  organizationId,
  status: "replacement",
  updatedAt: now,
};
const secondAgent: Agent = {
  ...agent,
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Agent B",
  status: "present",
};

describe("local building editor", () => {
  let database: BatimentControlDatabase;

  beforeEach(async () => {
    database = createTestDatabase();
    await database.organizationMembers.put(organizationMember);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("creates a building locally and enqueues an outbox operation", async () => {
    const result = await createBuilding({
      createId: createIdFactory([buildingId, mutationId, operationId]),
      database,
      input: {
        address: "12 rue du Controle",
        agentStatus: "unknown",
        areasToCheck: ["outdoor", "hall"],
        assignedAgentId: null,
        assignedAgentName: null,
        internalNotes: "Attention local poubelle",
        name: "batiment a",
        priorityLevel: "normal",
        sector: "secteur nord",
        serviceDays: [
          {
            day: "monday",
            id: "88888888-8888-4888-8888-888888888888",
            note: null,
            tasks: ["outdoor"],
          },
        ],
      },
      now: () => now,
      organizationId,
      userId,
    });

    expect(result.record).toMatchObject({
      createdAt: now,
      createdBy: userId,
      id: buildingId,
      name: "Batiment A",
      organizationId,
      sector: "Secteur Nord",
      updatedAt: now,
    });
    await expect(database.buildings.get(buildingId)).resolves.toEqual(result.record);
    await expect(
      database.buildingSectors.where("name").equals("Secteur Nord").count(),
    ).resolves.toBe(1);
    await expect(database.outbox.get(operationId)).resolves.toMatchObject({
      aggregateId: buildingId,
      entity: "buildings",
      organizationId,
      status: "pending",
    });
  });

  it("uses the selected local agent snapshot when creating a building", async () => {
    await database.agents.put(agent);

    const result = await createBuilding({
      createId: createIdFactory([buildingId, mutationId, operationId]),
      database,
      input: {
        address: "12 rue du Controle",
        agentStatus: "unknown",
        areasToCheck: [],
        assignedAgentId: agent.id,
        assignedAgentName: null,
        internalNotes: null,
        name: "batiment a",
        priorityLevel: "normal",
        sector: "secteur nord",
        serviceDays: [],
      },
      now: () => now,
      organizationId,
      userId,
    });

    expect(result.record).toMatchObject({
      agentStatus: "replacement",
      assignedAgentId: agent.id,
      assignedAgentIds: [agent.id],
      assignedAgentName: "Agent A",
    });
  });

  it("uses multiple selected local agents when creating a building", async () => {
    await database.agents.bulkPut([agent, secondAgent]);

    const result = await createBuilding({
      createId: createIdFactory([buildingId, mutationId, operationId]),
      database,
      input: {
        address: "12 rue du Controle",
        agentStatus: "unknown",
        areasToCheck: [],
        assignedAgentId: null,
        assignedAgentIds: [agent.id, secondAgent.id],
        assignedAgentName: null,
        internalNotes: null,
        name: "batiment a",
        priorityLevel: "normal",
        sector: "secteur nord",
        serviceDays: [],
      },
      now: () => now,
      organizationId,
      userId,
    });

    expect(result.record).toMatchObject({
      agentStatus: "unknown",
      assignedAgentId: agent.id,
      assignedAgentIds: [agent.id, secondAgent.id],
      assignedAgentName: "Agent A, Agent B",
    });
  });

  it("updates a building locally and enqueues an outbox operation", async () => {
    await createBuilding({
      createId: createIdFactory([buildingId, mutationId, operationId]),
      database,
      input: {
        address: "12 rue du Controle",
        agentStatus: "unknown",
        areasToCheck: [],
        assignedAgentId: null,
        assignedAgentName: null,
        internalNotes: null,
        name: "Batiment A",
        priorityLevel: "normal",
        sector: "Secteur Nord",
        serviceDays: [],
      },
      now: () => now,
      organizationId,
      userId,
    });

    const result = await updateBuilding({
      buildingId,
      createId: createIdFactory([secondMutationId, secondOperationId]),
      database,
      input: {
        address: "12 rue du Controle",
        agentStatus: "present",
        areasToCheck: ["common_areas"],
        assignedAgentId: null,
        assignedAgentName: "agent b",
        internalNotes: null,
        name: "batiment a (modifie)",
        priorityLevel: "high",
        sector: "secteur nord",
        serviceDays: [],
      },
      now: () => later,
      userId,
    });

    expect(result.record).toMatchObject({
      agentStatus: "unknown",
      assignedAgentId: null,
      assignedAgentIds: [],
      assignedAgentName: null,
      name: "Batiment A (Modifie)",
      priorityLevel: "high",
      sector: "Secteur Nord",
      updatedAt: later,
    });
    await expect(database.buildings.get(buildingId)).resolves.toEqual(result.record);
    await expect(database.outbox.get(secondOperationId)).resolves.toMatchObject({
      aggregateId: buildingId,
      entity: "buildings",
      status: "pending",
    });
  });

  it("soft-deletes a building locally and enqueues an outbox operation", async () => {
    await createBuilding({
      createId: createIdFactory([buildingId, mutationId, operationId]),
      database,
      input: {
        address: "12 rue du Controle",
        agentStatus: "unknown",
        areasToCheck: [],
        assignedAgentId: null,
        assignedAgentName: null,
        internalNotes: null,
        name: "Batiment A",
        priorityLevel: "normal",
        sector: "Secteur Nord",
        serviceDays: [],
      },
      now: () => now,
      organizationId,
      userId,
    });

    const result = await deleteBuilding({
      buildingId,
      createId: createIdFactory([secondMutationId, secondOperationId]),
      database,
      now: () => later,
      userId,
    });

    expect(result.record).toMatchObject({
      deletedAt: later,
      id: buildingId,
      updatedAt: later,
    });
    await expect(database.outbox.get(secondOperationId)).resolves.toMatchObject({
      aggregateId: buildingId,
      entity: "buildings",
      status: "pending",
    });
  });
});
