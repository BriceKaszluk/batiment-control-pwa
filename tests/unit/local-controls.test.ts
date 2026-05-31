import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BatimentControlDatabase } from "@/lib/db/schema";
import {
  getControlStatusLabel,
  listControlsForUser,
  startDraftControl,
} from "@/features/controls/services/local-controls";
import type { Building, Control, OrganizationMember } from "@/types/domain";

const now = "2026-05-31T00:00:00.000Z";
const later = "2026-05-31T01:00:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";
const controlId = "44444444-4444-4444-8444-444444444444";
const mutationId = "55555555-5555-4555-8555-555555555555";
const operationId = "66666666-6666-4666-8666-666666666666";

function createTestDatabase() {
  return new BatimentControlDatabase(
    `batiment-control-local-controls-test-${Date.now()}-${Math.random()}`,
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

const building: Building = {
  accessNotes: null,
  address: "12 rue du Controle",
  createdAt: now,
  createdBy: userId,
  deletedAt: null,
  id: buildingId,
  lastControlAt: null,
  name: "Batiment A",
  organizationId,
  priorityScore: 75,
  updatedAt: now,
};

function createControl(overrides: Partial<Control> = {}): Control {
  return {
    buildingId,
    completedAt: null,
    controlledBy: userId,
    createdAt: now,
    deletedAt: null,
    generalComment: null,
    id: controlId,
    organizationId,
    startedAt: now,
    status: "draft",
    updatedAt: now,
    ...overrides,
  };
}

describe("local controls", () => {
  let database: BatimentControlDatabase;

  beforeEach(() => {
    database = createTestDatabase();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("starts a draft control locally and creates an outbox operation", async () => {
    const result = await startDraftControl({
      building,
      createId: createIdFactory([controlId, mutationId, operationId]),
      database,
      now: () => now,
      userId,
    });

    await expect(database.controls.get(controlId)).resolves.toEqual(
      result.record,
    );
    await expect(database.outbox.get(operationId)).resolves.toMatchObject({
      aggregateId: controlId,
      entity: "controls",
      organizationId,
      status: "pending",
    });
    expect(result.record).toMatchObject({
      buildingId,
      controlledBy: userId,
      status: "draft",
    });
  });

  it("requires a user before creating a local control", async () => {
    await expect(
      startDraftControl({
        building,
        createId: createIdFactory([controlId, mutationId, operationId]),
        database,
        now: () => now,
        userId: null,
      }),
    ).rejects.toThrow("Utilisateur requis");
    await expect(database.controls.count()).resolves.toBe(0);
    await expect(database.outbox.count()).resolves.toBe(0);
  });

  it("lists local controls for the current user organizations", async () => {
    const recentControl = createControl({ id: controlId, startedAt: later });
    const olderControl = createControl({
      id: "77777777-7777-4777-8777-777777777777",
      startedAt: now,
    });
    const deletedControl = createControl({
      deletedAt: later,
      id: "88888888-8888-4888-8888-888888888888",
      startedAt: later,
    });

    await database.organizationMembers.put(organizationMember);
    await database.buildings.put(building);
    await database.controls.bulkPut([olderControl, deletedControl, recentControl]);

    await expect(
      listControlsForUser({ database, userId }),
    ).resolves.toEqual([
      {
        building,
        control: recentControl,
      },
      {
        building,
        control: olderControl,
      },
    ]);
  });

  it("formats control status labels", () => {
    expect(getControlStatusLabel("draft")).toBe("Brouillon");
    expect(getControlStatusLabel("completed")).toBe("Termine");
    expect(getControlStatusLabel("canceled")).toBe("Annule");
  });
});
