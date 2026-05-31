import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BatimentControlDatabase } from "@/lib/db/schema";
import { saveRemoteSnapshot, type RemoteSnapshot } from "@/lib/sync/remote-snapshot";
import type { Building, Organization, OrganizationMember } from "@/types/domain";

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
    buildings: [],
    checklistItems: [],
    checklistResults: [],
    controls: [],
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
  updatedAt: older,
};

const organizationMember: OrganizationMember = {
  createdAt: older,
  organizationId,
  role: "team_lead",
  userId,
};

const building: Building = {
  accessNotes: null,
  address: "12 rue du Controle",
  createdAt: older,
  createdBy: userId,
  deletedAt: null,
  id: buildingId,
  lastControlAt: null,
  name: "Batiment A",
  organizationId,
  priorityScore: 70,
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
