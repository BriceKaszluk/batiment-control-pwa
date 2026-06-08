import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BatimentControlDatabase } from "@/lib/db/schema";
import { getLocalDiagnostics } from "@/features/settings/services/local-diagnostics";
import type {
  Agent,
  Building,
  BuildingSector,
  Control,
  Organization,
  OrganizationMember,
} from "@/types/domain";

const now = "2026-05-31T00:00:00.000Z";
const midday = "2026-05-31T12:00:00.000Z";
const yesterday = "2026-05-30T12:00:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const otherOrganizationId = "99999999-9999-4999-8999-999999999999";
const userId = "22222222-2222-4222-8222-222222222222";
const otherUserId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const buildingId = "33333333-3333-4333-8333-333333333333";
const controlId = "44444444-4444-4444-8444-444444444444";
const completedControlId = "55555555-5555-4555-8555-555555555555";
const historyControlId = "66666666-6666-4666-8666-666666666666";
const agentId = "77777777-7777-4777-8777-777777777777";
const sectorId = "88888888-8888-4888-8888-888888888888";

function createTestDatabase() {
  return new BatimentControlDatabase(
    `batiment-control-local-diagnostics-test-${Date.now()}-${Math.random()}`,
  );
}

const organization: Organization = {
  createdAt: now,
  id: organizationId,
  name: "Espace personnel",
  ownerId: userId,
  updatedAt: now,
  workspaceType: "personal",
};

const otherOrganization: Organization = {
  createdAt: now,
  id: otherOrganizationId,
  name: "Autre espace",
  ownerId: otherUserId,
  updatedAt: now,
  workspaceType: "personal",
};

const organizationMember: OrganizationMember = {
  createdAt: now,
  organizationId,
  role: "team_lead",
  userId,
};

const otherOrganizationMember: OrganizationMember = {
  createdAt: now,
  organizationId: otherOrganizationId,
  role: "team_lead",
  userId,
};

const building: Building = {
  address: "12 rue du Controle",
  agentStatus: "unknown",
  areasToCheck: [],
  assignedAgentId: null,
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

const agent: Agent = {
  createdAt: now,
  createdBy: userId,
  deletedAt: null,
  id: agentId,
  name: "Agent A",
  organizationId,
  status: "present",
  updatedAt: now,
};

const sector: BuildingSector = {
  createdAt: now,
  createdBy: userId,
  deletedAt: null,
  id: sectorId,
  name: "Secteur Nord",
  organizationId,
  updatedAt: now,
};

function createControl(overrides: Partial<Control> = {}): Control {
  return {
    archivedAt: null,
    buildingId,
    completedAt: null,
    controlledBy: userId,
    createdAt: now,
    deletedAt: null,
    detailsPurgedAt: null,
    generalComment: null,
    id: controlId,
    organizationId,
    photosPurgedAt: null,
    qualityRating: null,
    startedAt: now,
    status: "draft",
    updatedAt: now,
    ...overrides,
  };
}

describe("local diagnostics", () => {
  let database: BatimentControlDatabase;

  beforeEach(() => {
    database = createTestDatabase();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("returns empty scoped counts without a user", async () => {
    await expect(
      getLocalDiagnostics({ database, userId: null }),
    ).resolves.toMatchObject({
      agentCount: 0,
      buildingCount: 0,
      draftControlCount: 0,
      historyControlCount: 0,
      sectorCount: 0,
      todayControlCount: 0,
    });
  });

  it("counts only personal local workspace data", async () => {
    await database.organizations.bulkPut([organization, otherOrganization]);
    await database.organizationMembers.bulkPut([
      organizationMember,
      otherOrganizationMember,
    ]);
    await database.agents.bulkPut([
      agent,
      {
        ...agent,
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        organizationId: otherOrganizationId,
      },
    ]);
    await database.buildingSectors.bulkPut([
      sector,
      {
        ...sector,
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        organizationId: otherOrganizationId,
      },
    ]);
    await database.buildings.bulkPut([
      building,
      {
        ...building,
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        organizationId: otherOrganizationId,
      },
    ]);
    await database.controls.bulkPut([
      createControl(),
      createControl({
        completedAt: midday,
        id: completedControlId,
        status: "completed",
      }),
      createControl({
        completedAt: yesterday,
        id: historyControlId,
        startedAt: yesterday,
        status: "completed",
      }),
      createControl({
        completedAt: midday,
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        organizationId: otherOrganizationId,
        status: "completed",
      }),
    ]);

    const diagnostics = await getLocalDiagnostics({
      database,
      now: () => midday,
      userId,
    });

    expect(diagnostics).toMatchObject({
      agentCount: 1,
      buildingCount: 1,
      draftControlCount: 1,
      historyControlCount: 1,
      sectorCount: 1,
      todayControlCount: 1,
    });
  });
});
