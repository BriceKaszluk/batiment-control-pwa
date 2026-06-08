import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BatimentControlDatabase } from "@/lib/db/schema";
import { saveRemoteSnapshot, type RemoteSnapshot } from "@/lib/sync/remote-snapshot";
import type {
  Agent,
  Building,
  BuildingSector,
  Control,
  ControlAreaResult,
  Organization,
  OrganizationMember,
} from "@/types/domain";

const older = "2026-05-31T00:00:00.000Z";
const newer = "2026-05-31T01:00:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";

function createTestDatabase() {
  return new BatimentControlDatabase(
    `batiment-control-remote-snapshot-test-${Date.now()}-${Math.random()}`,
  );
}

function createSnapshot(
  overrides: Partial<RemoteSnapshot> = {},
): RemoteSnapshot {
  return {
    agents: [],
    buildings: [],
    buildingSectors: [],
    checklistItems: [],
    controlAreaResults: [],
    checklistResults: [],
    controls: [],
    controlSummaries: [],
    correctiveActions: [],
    organizationMembers: [],
    organizations: [],
    ...overrides,
  };
}

const organization: Organization = {
  createdAt: older,
  id: organizationId,
  name: "Equipe Nord",
  ownerId: userId,
  updatedAt: older,
  workspaceType: "personal",
};

const organizationMember: OrganizationMember = {
  createdAt: older,
  organizationId,
  role: "team_lead",
  userId,
};

const agent: Agent = {
  createdAt: older,
  createdBy: userId,
  deletedAt: null,
  id: "44444444-4444-4444-8444-444444444444",
  name: "Agent A",
  organizationId,
  status: "present",
  updatedAt: older,
};

const buildingSector: BuildingSector = {
  createdAt: older,
  createdBy: userId,
  deletedAt: null,
  id: "99999999-9999-4999-8999-999999999999",
  name: "Secteur Nord",
  organizationId,
  updatedAt: older,
};

const building: Building = {
  address: "12 rue du Controle",
  agentStatus: "unknown",
  areasToCheck: [],
  assignedAgentId: null,
  assignedAgentName: null,
  createdAt: older,
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
  updatedAt: older,
};

const control: Control = {
  archivedAt: null,
  buildingId,
  completedAt: null,
  controlledBy: userId,
  createdAt: older,
  deletedAt: null,
  detailsPurgedAt: null,
  generalComment: null,
  id: "55555555-5555-4555-8555-555555555555",
  organizationId,
  photosPurgedAt: null,
  qualityRating: "acceptable",
  startedAt: older,
  status: "draft",
  updatedAt: older,
};

const controlAreaResult: ControlAreaResult = {
  area: "hall",
  controlId: control.id,
  createdAt: older,
  id: "66666666-6666-4666-8666-666666666666",
  organizationId,
  status: "unsatisfying",
  updatedAt: older,
};

describe("remote snapshot import", () => {
  let database: BatimentControlDatabase;

  beforeEach(() => {
    database = createTestDatabase();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("saves remote organization context locally", async () => {
    await saveRemoteSnapshot(
      createSnapshot({
        organizationMembers: [organizationMember],
        organizations: [organization],
      }),
      database,
    );

    await expect(database.organizations.get(organizationId)).resolves.toEqual(
      organization,
    );
    await expect(
      database.organizationMembers.get([organizationId, userId]),
    ).resolves.toEqual(organizationMember);
  });

  it("saves remote agents locally", async () => {
    await saveRemoteSnapshot(
      createSnapshot({
        agents: [agent],
      }),
      database,
    );

    await expect(database.agents.get(agent.id)).resolves.toEqual(agent);
  });

  it("saves remote building sectors locally", async () => {
    await saveRemoteSnapshot(
      createSnapshot({
        buildingSectors: [buildingSector],
      }),
      database,
    );

    await expect(database.buildingSectors.get(buildingSector.id)).resolves.toEqual(
      buildingSector,
    );
  });

  it("saves remote controls with their quality rating locally", async () => {
    await saveRemoteSnapshot(
      createSnapshot({
        controls: [control],
      }),
      database,
    );

    await expect(database.controls.get(control.id)).resolves.toEqual(control);
  });

  it("saves remote control area results locally", async () => {
    await saveRemoteSnapshot(
      createSnapshot({
        controlAreaResults: [controlAreaResult],
      }),
      database,
    );

    await expect(
      database.controlAreaResults.get(controlAreaResult.id),
    ).resolves.toEqual(controlAreaResult);
  });

  it("keeps a newer local version instead of overwriting it", async () => {
    await database.buildings.put({
      ...building,
      name: "Version locale",
      updatedAt: newer,
    });

    await saveRemoteSnapshot(
      createSnapshot({
        buildings: [
          {
            ...building,
            name: "Version distante ancienne",
            updatedAt: older,
          },
        ],
      }),
      database,
    );

    await expect(database.buildings.get(buildingId)).resolves.toMatchObject({
      name: "Version locale",
      updatedAt: newer,
    });
  });

  it("uses a newer remote version when it wins the conflict", async () => {
    await database.buildings.put(building);

    await saveRemoteSnapshot(
      createSnapshot({
        buildings: [
          {
            ...building,
            name: "Version distante recente",
            updatedAt: newer,
          },
        ],
      }),
      database,
    );

    await expect(database.buildings.get(buildingId)).resolves.toMatchObject({
      name: "Version distante recente",
      updatedAt: newer,
    });
  });
});
