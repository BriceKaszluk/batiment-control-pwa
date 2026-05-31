import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createRepositories } from "@/lib/db/repositories";
import { BatimentControlDatabase } from "@/lib/db/schema";
import type { Building, Organization, OrganizationMember } from "@/types/domain";

const now = "2026-05-31T00:00:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";

function createTestDatabase() {
  return new BatimentControlDatabase(
    `batiment-control-test-${Date.now()}-${Math.random()}`,
  );
}

const organization: Organization = {
  createdAt: now,
  id: organizationId,
  name: "Equipe Nord",
  updatedAt: now,
};

const organizationMember: OrganizationMember = {
  createdAt: now,
  organizationId,
  role: "team_lead",
  userId,
};

const building: Building = {
  address: "12 rue du Controle",
  agentStatus: "unknown",
  areasToCheck: [],
  assignedAgentName: null,
  createdAt: now,
  createdBy: userId,
  deletedAt: null,
  id: buildingId,
  internalNotes: null,
  lastControlAt: null,
  name: "Batiment A",
  organizationId,
  priorityLevel: "high",
  sector: "Secteur Nord",
  serviceDays: [],
  updatedAt: now,
};

describe("Dexie repositories", () => {
  let database: BatimentControlDatabase;
  let repositories: ReturnType<typeof createRepositories>;

  beforeEach(() => {
    database = createTestDatabase();
    repositories = createRepositories(database);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("declares the expected local tables", () => {
    expect(database.tables.map((table) => table.name).sort()).toEqual([
      "buildings",
      "checklistItems",
      "checklistResults",
      "controlPhotos",
      "controls",
      "correctiveActions",
      "organizationMembers",
      "organizations",
      "outbox",
      "photoUploads",
    ]);
  });

  it("saves and lists synced organization-scoped records", async () => {
    await repositories.organizations.saveSynced(organization);
    await repositories.buildings.saveSynced(building);

    await expect(repositories.buildings.getById(buildingId)).resolves.toEqual(
      building,
    );
    await expect(
      repositories.buildings.listByOrganization(organizationId),
    ).resolves.toEqual([building]);
  });

  it("rejects invalid records before writing to IndexedDB", async () => {
    const invalidBuilding: Building = {
      ...building,
      sector: " ",
    };

    await expect(
      repositories.buildings.saveSynced(invalidBuilding),
    ).rejects.toThrow();
    await expect(repositories.buildings.getById(buildingId)).resolves.toBeUndefined();
  });

  it("uses organization and user as the organization member key", async () => {
    await expect(
      repositories.organizationMembers.saveSynced(organizationMember),
    ).resolves.toEqual([organizationId, userId]);

    await expect(
      repositories.organizationMembers.getByKey([organizationId, userId]),
    ).resolves.toEqual(organizationMember);
  });
});
