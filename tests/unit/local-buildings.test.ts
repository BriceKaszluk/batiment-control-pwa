import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BatimentControlDatabase } from "@/lib/db/schema";
import {
  getBuildingPriorityLabel,
  listBuildingsForUser,
} from "@/features/buildings/services/local-buildings";
import type { Building, OrganizationMember } from "@/types/domain";

const now = "2026-05-31T00:00:00.000Z";
const older = "2026-05-01T00:00:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const otherOrganizationId = "99999999-9999-4999-8999-999999999999";
const userId = "22222222-2222-4222-8222-222222222222";

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

  it("sorts buildings by priority then oldest control date", async () => {
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
      listBuildingsForUser({ database, userId }),
    ).resolves.toEqual([neverControlled, oldControl, lowerPriority]);
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

  it("formats priority labels", () => {
    expect(getBuildingPriorityLabel("critical")).toBe("Priorite critique");
    expect(getBuildingPriorityLabel("high")).toBe("Priorite haute");
    expect(getBuildingPriorityLabel("normal")).toBe("Priorite normale");
    expect(getBuildingPriorityLabel("low")).toBe("Priorite basse");
  });
});
