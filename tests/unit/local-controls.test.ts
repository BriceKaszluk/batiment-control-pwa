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
const midday = "2026-05-31T12:00:00.000Z";
const yesterday = "2026-05-30T12:00:00.000Z";
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
    expect(result.reusedExisting).toBe(false);
  });

  it("reuses an existing draft control for the same building and user", async () => {
    const existingDraftControl = createControl({
      id: controlId,
      startedAt: now,
    });

    await database.controls.put(existingDraftControl);

    const result = await startDraftControl({
      building,
      createId: createIdFactory([mutationId, operationId]),
      database,
      now: () => later,
      userId,
    });

    expect(result).toEqual({
      outboxOperation: null,
      record: existingDraftControl,
      reusedExisting: true,
    });
    await expect(database.controls.count()).resolves.toBe(1);
    await expect(database.outbox.count()).resolves.toBe(0);
  });

  it("creates a new draft when the existing control is completed", async () => {
    await database.controls.put(
      createControl({
        completedAt: now,
        status: "completed",
      }),
    );

    const result = await startDraftControl({
      building,
      createId: createIdFactory([mutationId, operationId, controlId]),
      database,
      now: () => later,
      userId,
    });

    expect(result.reusedExisting).toBe(false);
    await expect(database.controls.count()).resolves.toBe(2);
    await expect(database.outbox.count()).resolves.toBe(1);
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

  it("lists draft controls and controls completed today", async () => {
    const draftControl = createControl({ id: controlId, startedAt: later });
    const completedTodayControl = createControl({
      completedAt: later,
      id: "77777777-7777-4777-8777-777777777777",
      startedAt: now,
      status: "completed",
    });
    const completedYesterdayControl = createControl({
      completedAt: yesterday,
      id: "99999999-9999-4999-8999-999999999999",
      startedAt: yesterday,
      status: "completed",
    });
    const deletedControl = createControl({
      deletedAt: later,
      id: "88888888-8888-4888-8888-888888888888",
      startedAt: later,
    });

    await database.organizationMembers.put(organizationMember);
    await database.buildings.put(building);
    await database.controls.bulkPut([
      completedTodayControl,
      completedYesterdayControl,
      deletedControl,
      draftControl,
    ]);

    await expect(
      listControlsForUser({ database, now: () => midday, userId }),
    ).resolves.toEqual([
      {
        building,
        control: draftControl,
      },
      {
        building,
        control: completedTodayControl,
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

  it("lists only completed controls before today in local history", async () => {
    const completedTodayControl = createControl({
      completedAt: later,
      status: "completed",
      updatedAt: later,
    });
    const completedYesterdayControl = createControl({
      completedAt: yesterday,
      id: "77777777-7777-4777-8777-777777777777",
      startedAt: yesterday,
      status: "completed",
      updatedAt: yesterday,
    });
    const olderCompletedControl = createControl({
      completedAt: "2026-05-01T00:00:00.000Z",
      id: "99999999-9999-4999-8999-999999999999",
      startedAt: "2026-05-01T00:00:00.000Z",
      status: "completed",
      updatedAt: "2026-05-01T00:00:00.000Z",
    });
    const draftControl = createControl({
      id: "88888888-8888-4888-8888-888888888888",
    });

    await database.organizationMembers.put(organizationMember);
    await database.buildings.put(building);
    await database.controls.bulkPut([
      olderCompletedControl,
      draftControl,
      completedTodayControl,
      completedYesterdayControl,
    ]);

    await expect(
      listControlHistoryForUser({ database, now: () => midday, userId }),
    ).resolves.toEqual([
      {
        building,
        controlledAreaResultCount: 0,
        control: completedYesterdayControl,
        photoCount: 0,
      },
      {
        building,
        controlledAreaResultCount: 0,
        control: olderCompletedControl,
        photoCount: 0,
      },
    ]);
  });

  it("searches local history by building, comment, rating or date", async () => {
    const matchingControl = createControl({
      completedAt: yesterday,
      generalComment: "Vitres sensibles a surveiller",
      id: "77777777-7777-4777-8777-777777777777",
      qualityRating: "unsatisfying",
      startedAt: yesterday,
      status: "completed",
      updatedAt: yesterday,
    });
    const otherControl = createControl({
      completedAt: "2026-05-01T00:00:00.000Z",
      generalComment: "Hall propre",
      id: "88888888-8888-4888-8888-888888888888",
      qualityRating: "satisfying",
      startedAt: "2026-05-01T00:00:00.000Z",
      status: "completed",
      updatedAt: "2026-05-01T00:00:00.000Z",
    });

    await database.organizationMembers.put(organizationMember);
    await database.buildings.put(building);
    await database.controls.bulkPut([otherControl, matchingControl]);

    await expect(
      listControlHistoryForUser({
        database,
        now: () => midday,
        searchQuery: "insatisfaisant",
        userId,
      }),
    ).resolves.toEqual([
      {
        building,
        controlledAreaResultCount: 0,
        control: matchingControl,
        photoCount: 0,
      },
    ]);
    await expect(
      listControlHistoryForUser({
        database,
        now: () => midday,
        searchQuery: "vitres",
        userId,
      }),
    ).resolves.toEqual([
      {
        building,
        controlledAreaResultCount: 0,
        control: matchingControl,
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
