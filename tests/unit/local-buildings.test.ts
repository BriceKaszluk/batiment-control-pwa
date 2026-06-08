import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BatimentControlDatabase } from "@/lib/db/schema";
import {
  getBuildingPriorityLabel,
  listBuildingEntriesForUser,
  listBuildingsForUser,
} from "@/features/buildings/services/local-buildings";
import type { Agent, Building, Control, OrganizationMember } from "@/types/domain";

const now = "2026-05-31T00:00:00.000Z";
const older = "2026-05-01T00:00:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const otherOrganizationId = "99999999-9999-4999-8999-999999999999";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";

function createTestDatabase() {
  return new BatimentControlDatabase(
    `batiment-control-local-buildings-test-${Date.now()}-${Math.random()}`,
  );
}

function createBuilding(
  overrides: Partial<Building> & Pick<Building, "id" | "name" | "priorityLevel">,
): Building {
  const { id, name, priorityLevel, ...optionalOverrides } = overrides;

  return {
    address: "12 rue du Controle",
    agentStatus: "unknown",
    areasToCheck: [],
    assignedAgentId: null,
    assignedAgentName: null,
    createdAt: now,
    createdBy: userId,
    deletedAt: null,
    id,
    internalNotes: null,
    lastControlAt: null,
    name,
    organizationId,
    priorityLevel,
    sector: "Secteur Nord",
    serviceDays: [],
    updatedAt: now,
    ...optionalOverrides,
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
  id: "66666666-6666-4666-8666-666666666666",
  name: "Agent A",
  organizationId,
  status: "present",
  updatedAt: now,
};

function createControl(overrides: Partial<Control> & Pick<Control, "id">): Control {
  const { id, ...optionalOverrides } = overrides;

  return {
    archivedAt: null,
    buildingId,
    completedAt: now,
    controlledBy: userId,
    createdAt: now,
    deletedAt: null,
    detailsPurgedAt: null,
    generalComment: null,
    id,
    organizationId,
    photosPurgedAt: null,
    qualityRating: "acceptable",
    startedAt: now,
    status: "completed",
    updatedAt: now,
    ...optionalOverrides,
  };
}

describe("local buildings", () => {
  let database: BatimentControlDatabase;

  beforeEach(() => {
    database = createTestDatabase();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("lists visible buildings for the current user organizations", async () => {
    const visibleBuilding = createBuilding({
      id: "33333333-3333-4333-8333-333333333333",
      name: "Batiment visible",
      priorityLevel: "normal",
    });
    const otherOrganizationBuilding = createBuilding({
      id: "44444444-4444-4444-8444-444444444444",
      name: "Autre organisation",
      organizationId: otherOrganizationId,
      priorityLevel: "high",
    });

    await database.organizationMembers.put(organizationMember);
    await database.buildings.bulkPut([
      visibleBuilding,
      otherOrganizationBuilding,
    ]);

    await expect(
      listBuildingsForUser({ database, userId }),
    ).resolves.toEqual([visibleBuilding]);
  });

  it("sorts buildings by calculated priority score", async () => {
    const neverControlled = createBuilding({
      id: "33333333-3333-4333-8333-333333333333",
      name: "Jamais controle",
      priorityLevel: "high",
    });
    const oldControl = createBuilding({
      id: "44444444-4444-4444-8444-444444444444",
      lastControlAt: older,
      name: "Ancien controle",
      priorityLevel: "high",
    });
    const lowerPriority = createBuilding({
      id: "55555555-5555-4555-8555-555555555555",
      name: "Priorite plus basse",
      priorityLevel: "normal",
    });

    await database.organizationMembers.put(organizationMember);
    await database.buildings.bulkPut([lowerPriority, oldControl, neverControlled]);

    await expect(
      listBuildingsForUser({ database, now: () => now, userId }),
    ).resolves.toEqual([neverControlled, lowerPriority, oldControl]);
  });

  it("excludes deleted buildings and applies limits", async () => {
    await database.organizationMembers.put(organizationMember);
    await database.buildings.bulkPut([
      createBuilding({
        id: "33333333-3333-4333-8333-333333333333",
        name: "Premier",
        priorityLevel: "critical",
      }),
      createBuilding({
        deletedAt: now,
        id: "44444444-4444-4444-8444-444444444444",
        name: "Supprime",
        priorityLevel: "high",
      }),
      createBuilding({
        id: "55555555-5555-4555-8555-555555555555",
        name: "Deuxieme",
        priorityLevel: "normal",
      }),
    ]);

    await expect(
      listBuildingsForUser({ database, limit: 1, userId }),
    ).resolves.toHaveLength(1);
    await expect(
      listBuildingsForUser({ database, userId }),
    ).resolves.toEqual([
      expect.objectContaining({ name: "Premier" }),
      expect.objectContaining({ name: "Deuxieme" }),
    ]);
  });

  it("filters buildings by a partial name match", async () => {
    const matchingBuilding = createBuilding({
      id: "33333333-3333-4333-8333-333333333333",
      name: "Le Roux",
      priorityLevel: "normal",
    });
    const otherBuilding = createBuilding({
      id: "44444444-4444-4444-8444-444444444444",
      name: "Residence Acacia",
      priorityLevel: "normal",
    });

    await database.organizationMembers.put(organizationMember);
    await database.buildings.bulkPut([otherBuilding, matchingBuilding]);

    await expect(
      listBuildingsForUser({ database, searchQuery: "Rou", userId }),
    ).resolves.toEqual([matchingBuilding]);
  });

  it("filters buildings by address, sector, notes or assigned agent", async () => {
    const assignedBuilding = createBuilding({
      address: "4 impasse des Tilleuls",
      assignedAgentId: agent.id,
      id: "33333333-3333-4333-8333-333333333333",
      internalNotes: "Controle local poubelles sensible",
      name: "Residence calme",
      priorityLevel: "normal",
      sector: "Tournee Ouest",
    });
    const otherBuilding = createBuilding({
      id: "44444444-4444-4444-8444-444444444444",
      name: "Residence Est",
      priorityLevel: "normal",
      sector: "Tournee Est",
    });

    await database.organizationMembers.put(organizationMember);
    await database.agents.put({
      ...agent,
      name: "Bruno Agent",
    });
    await database.buildings.bulkPut([otherBuilding, assignedBuilding]);

    await expect(
      listBuildingsForUser({ database, searchQuery: "tilleuls", userId }),
    ).resolves.toEqual([assignedBuilding]);
    await expect(
      listBuildingsForUser({ database, searchQuery: "ouest", userId }),
    ).resolves.toEqual([assignedBuilding]);
    await expect(
      listBuildingsForUser({ database, searchQuery: "poubelles", userId }),
    ).resolves.toEqual([assignedBuilding]);
    await expect(
      listBuildingsForUser({ database, searchQuery: "bruno", userId }),
    ).resolves.toEqual([assignedBuilding]);
  });

  it("returns the latest assigned agent for building list entries", async () => {
    const assignedBuilding = createBuilding({
      assignedAgentId: agent.id,
      id: "33333333-3333-4333-8333-333333333333",
      name: "Batiment assigne",
      priorityLevel: "normal",
    });

    await database.organizationMembers.put(organizationMember);
    await database.agents.put(agent);
    await database.buildings.put(assignedBuilding);

    await expect(
      listBuildingEntriesForUser({ database, userId }),
    ).resolves.toEqual([
      {
        agent,
        building: assignedBuilding,
        priorityScore: expect.objectContaining({
          score: 59,
        }),
        recentCompletedControls: [],
      },
    ]);

    await database.agents.put({
      ...agent,
      status: "sick_leave",
      updatedAt: "2026-05-31T01:00:00.000Z",
    });

    await expect(
      listBuildingEntriesForUser({ database, userId }),
    ).resolves.toEqual([
      {
        agent: expect.objectContaining({
          id: agent.id,
          status: "sick_leave",
        }),
        building: assignedBuilding,
        priorityScore: expect.objectContaining({
          score: 59,
        }),
        recentCompletedControls: [],
      },
    ]);
  });

  it("returns the latest completed controls for building consultation", async () => {
    const buildingWithHistory = createBuilding({
      id: buildingId,
      name: "Batiment historique",
      priorityLevel: "normal",
    });
    const latestControl = createControl({
      completedAt: "2026-05-30T00:00:00.000Z",
      id: "77777777-7777-4777-8777-777777777777",
      startedAt: "2026-05-30T00:00:00.000Z",
    });
    const secondControl = createControl({
      completedAt: "2026-05-15T00:00:00.000Z",
      id: "88888888-8888-4888-8888-888888888888",
      startedAt: "2026-05-15T00:00:00.000Z",
    });
    const thirdControl = createControl({
      completedAt: "2026-05-01T00:00:00.000Z",
      id: "99999999-9999-4999-8999-999999999999",
      startedAt: "2026-05-01T00:00:00.000Z",
    });
    const olderControl = createControl({
      completedAt: "2026-04-01T00:00:00.000Z",
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      startedAt: "2026-04-01T00:00:00.000Z",
    });

    await database.organizationMembers.put(organizationMember);
    await database.buildings.put(buildingWithHistory);
    await database.controls.bulkPut([
      olderControl,
      secondControl,
      latestControl,
      thirdControl,
    ]);

    const [entry] = await listBuildingEntriesForUser({ database, userId });

    expect(entry?.recentCompletedControls.map((control) => control.id)).toEqual([
      latestControl.id,
      secondControl.id,
      thirdControl.id,
    ]);
  });

  it("formats priority labels", () => {
    expect(getBuildingPriorityLabel("critical")).toBe("Priorite critique");
    expect(getBuildingPriorityLabel("high")).toBe("Priorite haute");
    expect(getBuildingPriorityLabel("normal")).toBe("Priorite normale");
    expect(getBuildingPriorityLabel("low")).toBe("Priorite basse");
  });
});
