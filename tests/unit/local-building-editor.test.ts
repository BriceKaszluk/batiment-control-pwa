import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createBuilding,
  deleteBuilding,
  updateBuilding,
} from "@/features/buildings/services/local-building-editor";
import { BatimentControlDatabase } from "@/lib/db/schema";
import type { OrganizationMember } from "@/types/domain";

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
        areasToCheck: ["outdoor", "entrance_hall"],
        assignedAgentName: null,
        internalNotes: "Attention local poubelle",
        name: "Batiment A",
        priorityLevel: "normal",
        sector: "Secteur Nord",
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
      organizationId,
      updatedAt: now,
    });
    await expect(database.buildings.get(buildingId)).resolves.toEqual(result.record);
    await expect(database.outbox.get(operationId)).resolves.toMatchObject({
      aggregateId: buildingId,
      entity: "buildings",
      organizationId,
      status: "pending",
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
        areasToCheck: ["trash_room"],
        assignedAgentName: "Agent B",
        internalNotes: null,
        name: "Batiment A (modifie)",
        priorityLevel: "high",
        sector: "Secteur Nord",
        serviceDays: [],
      },
      now: () => later,
      userId,
    });

    expect(result.record).toMatchObject({
      agentStatus: "present",
      assignedAgentName: "Agent B",
      name: "Batiment A (modifie)",
      priorityLevel: "high",
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

