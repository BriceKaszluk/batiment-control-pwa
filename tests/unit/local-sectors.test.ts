import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  deleteBuildingSector,
  ensureBuildingSector,
  listBuildingSectorsForUser,
} from "@/features/buildings/services/local-sectors";
import { BatimentControlDatabase } from "@/lib/db/schema";
import type { Organization, OrganizationMember } from "@/types/domain";

const now = "2026-05-31T00:00:00.000Z";
const later = "2026-05-31T01:00:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const sectorId = "33333333-3333-4333-8333-333333333333";
const mutationId = "44444444-4444-4444-8444-444444444444";
const operationId = "55555555-5555-4555-8555-555555555555";
const secondMutationId = "66666666-6666-4666-8666-666666666666";
const secondOperationId = "77777777-7777-4777-8777-777777777777";
const thirdMutationId = "88888888-8888-4888-8888-888888888888";
const thirdOperationId = "99999999-9999-4999-8999-999999999999";

function createTestDatabase() {
  return new BatimentControlDatabase(
    `batiment-control-local-sectors-test-${Date.now()}-${Math.random()}`,
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

const organization: Organization = {
  createdAt: now,
  id: organizationId,
  name: "Mon espace",
  ownerId: userId,
  updatedAt: now,
  workspaceType: "personal",
};

const organizationMember: OrganizationMember = {
  createdAt: now,
  organizationId,
  role: "team_lead",
  userId,
};

describe("local building sectors", () => {
  let database: BatimentControlDatabase;

  beforeEach(async () => {
    database = createTestDatabase();
    await database.organizations.put(organization);
    await database.organizationMembers.put(organizationMember);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("creates, deletes and reactivates reusable sectors through the outbox", async () => {
    const createdSector = await ensureBuildingSector({
      createId: createIdFactory([sectorId, mutationId, operationId]),
      database,
      name: " Secteur Nord ",
      now: () => now,
      organizationId,
      userId,
    });

    expect(createdSector).toMatchObject({
      id: sectorId,
      name: "Secteur Nord",
      organizationId,
    });
    await expect(listBuildingSectorsForUser({ database, userId })).resolves.toEqual([
      createdSector,
    ]);
    await expect(database.outbox.get(operationId)).resolves.toMatchObject({
      aggregateId: sectorId,
      entity: "buildingSectors",
      status: "pending",
    });

    const deletedSector = await deleteBuildingSector({
      createId: createIdFactory([secondMutationId, secondOperationId]),
      database,
      now: () => later,
      sectorId,
      userId,
    });

    expect(deletedSector.record).toMatchObject({
      deletedAt: later,
      id: sectorId,
    });
    await expect(listBuildingSectorsForUser({ database, userId })).resolves.toEqual(
      [],
    );

    const reactivatedSector = await ensureBuildingSector({
      createId: createIdFactory([thirdMutationId, thirdOperationId]),
      database,
      name: "secteur nord",
      now: () => "2026-05-31T02:00:00.000Z",
      organizationId,
      userId,
    });

    expect(reactivatedSector).toMatchObject({
      deletedAt: null,
      id: sectorId,
      name: "Secteur Nord",
    });
    await expect(database.outbox.get(thirdOperationId)).resolves.toMatchObject({
      aggregateId: sectorId,
      entity: "buildingSectors",
      status: "pending",
    });
  });
});
