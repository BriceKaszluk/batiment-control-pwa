import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BatimentControlDatabase } from "@/lib/db/schema";
import {
  getControlQualityRatingLabel,
  getLocalControlDetail,
  saveControlAreaResult,
  saveControlComment,
  saveControlQualityRating,
} from "@/features/controls/services/local-control-detail";
import type {
  Building,
  ControlAreaResult,
  Control,
  OrganizationMember,
} from "@/types/domain";

const now = "2026-05-31T00:00:00.000Z";
const later = "2026-05-31T01:00:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";
const controlId = "44444444-4444-4444-8444-444444444444";
const controlAreaResultId = "99999999-9999-4999-8999-999999999999";
const mutationId = "77777777-7777-4777-8777-777777777777";
const operationId = "88888888-8888-4888-8888-888888888888";

function createTestDatabase() {
  return new BatimentControlDatabase(
    `batiment-control-local-detail-test-${Date.now()}-${Math.random()}`,
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
  areasToCheck: ["hall"],
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

const control: Control = {
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
};

function createControlAreaResult(
  overrides: Partial<ControlAreaResult> = {},
): ControlAreaResult {
  return {
    area: "hall",
    controlId,
    createdAt: now,
    id: controlAreaResultId,
    organizationId,
    status: "satisfying",
    updatedAt: now,
    ...overrides,
  };
}

describe("local control detail", () => {
  let database: BatimentControlDatabase;

  beforeEach(async () => {
    database = createTestDatabase();
    await database.organizationMembers.put(organizationMember);
    await database.buildings.put(building);
    await database.controls.put(control);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("loads a local control with controlled building elements", async () => {
    const controlAreaResult = createControlAreaResult();
    await database.controlAreaResults.put(controlAreaResult);

    await expect(
      getLocalControlDetail({ controlId, database, userId }),
    ).resolves.toEqual({
      agent: null,
      agents: [],
      areaResults: [
        {
          area: "hall",
          result: controlAreaResult,
        },
      ],
      building,
      control,
      photos: [],
    });
  });

  it("creates a control area result locally with an outbox operation", async () => {
    const result = await saveControlAreaResult({
      area: "hall",
      controlId,
      createId: createIdFactory([controlAreaResultId, mutationId, operationId]),
      database,
      now: () => now,
      status: "unsatisfying",
      userId,
    });

    await expect(database.controlAreaResults.get(controlAreaResultId)).resolves.toEqual(
      result.record,
    );
    await expect(database.outbox.get(operationId)).resolves.toMatchObject({
      aggregateId: controlAreaResultId,
      entity: "controlAreaResults",
      organizationId,
      status: "pending",
    });
    expect(result.record).toMatchObject({
      area: "hall",
      status: "unsatisfying",
    });
  });

  it("updates an existing control area result while preserving its id", async () => {
    await database.controlAreaResults.put(createControlAreaResult());

    const result = await saveControlAreaResult({
      area: "hall",
      controlId,
      createId: createIdFactory([mutationId, operationId]),
      database,
      now: () => later,
      status: "unsatisfying",
      userId,
    });

    expect(result.record).toMatchObject({
      createdAt: now,
      id: controlAreaResultId,
      status: "unsatisfying",
      updatedAt: later,
    });
    await expect(database.controlAreaResults.count()).resolves.toBe(1);
    await expect(database.outbox.get(operationId)).resolves.toMatchObject({
      aggregateId: controlAreaResultId,
      entity: "controlAreaResults",
    });
  });

  it("requires an authorized organization membership before saving", async () => {
    await database.organizationMembers.clear();

    await expect(
      saveControlAreaResult({
        area: "hall",
        controlId,
        database,
        status: "satisfying",
        userId,
      }),
    ).rejects.toThrow("Organisation locale non autorisee");
    await expect(database.controlAreaResults.count()).resolves.toBe(0);
    await expect(database.outbox.count()).resolves.toBe(0);
  });

  it("updates the control comment locally with an outbox operation", async () => {
    const result = await saveControlComment({
      comment: "  Vitres a surveiller  ",
      controlId,
      createId: createIdFactory([mutationId, operationId]),
      database,
      now: () => later,
      userId,
    });

    expect(result.record).toMatchObject({
      createdAt: now,
      generalComment: "Vitres a surveiller",
      id: controlId,
      updatedAt: later,
    });
    await expect(database.controls.get(controlId)).resolves.toEqual(result.record);
    await expect(database.outbox.get(operationId)).resolves.toMatchObject({
      aggregateId: controlId,
      entity: "controls",
      organizationId,
      status: "pending",
    });
  });

  it("updates the control quality rating locally with an outbox operation", async () => {
    const result = await saveControlQualityRating({
      controlId,
      createId: createIdFactory([mutationId, operationId]),
      database,
      now: () => later,
      qualityRating: "to_improve",
      userId,
    });

    expect(result.record).toMatchObject({
      id: controlId,
      qualityRating: "to_improve",
      updatedAt: later,
    });
    await expect(database.controls.get(controlId)).resolves.toEqual(result.record);
    await expect(database.outbox.get(operationId)).resolves.toMatchObject({
      aggregateId: controlId,
      entity: "controls",
      organizationId,
      status: "pending",
    });
  });

  it("formats control quality labels", () => {
    expect(getControlQualityRatingLabel("satisfying")).toBe("Satisfaisant");
    expect(getControlQualityRatingLabel("acceptable")).toBe("Acceptable");
    expect(getControlQualityRatingLabel("to_improve")).toBe("A ameliorer");
    expect(getControlQualityRatingLabel("unsatisfying")).toBe("Insatisfaisant");
  });
});
