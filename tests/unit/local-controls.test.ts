import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BatimentControlDatabase } from "@/lib/db/schema";
import {
  completeControl,
  getControlStatusLabel,
  listControlHistoryForUser,
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
const secondOperationId = "99999999-9999-4999-8999-999999999999";

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

  it("completes a control locally and updates the building in one mutation", async () => {
    const draftControl = createControl();
    await database.organizationMembers.put(organizationMember);
    await database.buildings.put(building);
    await database.controls.put(draftControl);

    const result = await completeControl({
      controlId,
      createId: createIdFactory([mutationId, operationId, secondOperationId]),
      database,
      now: () => later,
      userId,
    });

    expect(result.control).toMatchObject({
      completedAt: later,
      id: controlId,
      status: "completed",
      updatedAt: later,
    });
    expect(result.building).toMatchObject({
      id: buildingId,
      lastControlAt: later,
      updatedAt: later,
    });
    await expect(database.controls.get(controlId)).resolves.toEqual(
      result.control,
    );
    await expect(database.buildings.get(buildingId)).resolves.toEqual(
      result.building,
    );
    await expect(database.outbox.get(operationId)).resolves.toMatchObject({
      aggregateId: controlId,
      entity: "controls",
      status: "pending",
    });
    await expect(database.outbox.get(secondOperationId)).resolves.toMatchObject({
      aggregateId: buildingId,
      entity: "buildings",
      status: "pending",
    });
  });

  it("does not complete a control without organization membership", async () => {
    await database.buildings.put(building);
    await database.controls.put(createControl());

    await expect(
      completeControl({
        controlId,
        createId: createIdFactory([mutationId, operationId, secondOperationId]),
        database,
        now: () => later,
        userId,
      }),
    ).rejects.toThrow("Organisation locale non autorisee");
    await expect(database.controls.get(controlId)).resolves.toMatchObject({
      completedAt: null,
      status: "draft",
    });
    await expect(database.buildings.get(buildingId)).resolves.toMatchObject({
      lastControlAt: null,
    });
    await expect(database.outbox.count()).resolves.toBe(0);
  });

  it("lists only completed controls in local history", async () => {
    const completedControl = createControl({
      completedAt: later,
      status: "completed",
      updatedAt: later,
    });
    const olderCompletedControl = createControl({
      completedAt: now,
      id: "77777777-7777-4777-8777-777777777777",
      status: "completed",
      updatedAt: now,
    });
    const draftControl = createControl({
      id: "88888888-8888-4888-8888-888888888888",
    });

    await database.organizationMembers.put(organizationMember);
    await database.buildings.put(building);
    await database.controls.bulkPut([
      olderCompletedControl,
      draftControl,
      completedControl,
    ]);

    await expect(
      listControlHistoryForUser({ database, userId }),
    ).resolves.toEqual([
      {
        building,
        checklistResultCount: 0,
        control: completedControl,
        correctiveActionCount: 0,
        photoCount: 0,
      },
      {
        building,
        checklistResultCount: 0,
        control: olderCompletedControl,
        correctiveActionCount: 0,
        photoCount: 0,
      },
    ]);
  });

  it("formats control status labels", () => {
    expect(getControlStatusLabel("draft")).toBe("Brouillon");
    expect(getControlStatusLabel("completed")).toBe("Termine");
    expect(getControlStatusLabel("canceled")).toBe("Annule");
  });
});
