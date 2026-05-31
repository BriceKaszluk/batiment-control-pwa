import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BatimentControlDatabase } from "@/lib/db/schema";
import {
  getChecklistResultStatusLabel,
  getLocalControlDetail,
  saveControlComment,
  saveChecklistResult,
} from "@/features/controls/services/local-control-detail";
import type {
  Building,
  ChecklistItem,
  ChecklistResult,
  Control,
  OrganizationMember,
} from "@/types/domain";

const now = "2026-05-31T00:00:00.000Z";
const later = "2026-05-31T01:00:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";
const controlId = "44444444-4444-4444-8444-444444444444";
const checklistItemId = "55555555-5555-4555-8555-555555555555";
const checklistResultId = "66666666-6666-4666-8666-666666666666";
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

const control: Control = {
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
};

const checklistItem: ChecklistItem = {
  createdAt: now,
  createdBy: userId,
  deletedAt: null,
  description: "Verifier le hall",
  id: checklistItemId,
  isActive: true,
  isRequired: true,
  label: "Hall propre",
  organizationId,
  position: 1,
  updatedAt: now,
};

function createChecklistResult(
  overrides: Partial<ChecklistResult> = {},
): ChecklistResult {
  return {
    checklistItemId,
    comment: null,
    controlId,
    createdAt: now,
    id: checklistResultId,
    organizationId,
    status: "compliant",
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
    await database.checklistItems.put(checklistItem);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("loads a local control with checklist items and existing results", async () => {
    const checklistResult = createChecklistResult();
    await database.checklistResults.put(checklistResult);

    await expect(
      getLocalControlDetail({ controlId, database, userId }),
    ).resolves.toEqual({
      building,
      checklist: [
        {
          item: checklistItem,
          result: checklistResult,
        },
      ],
      control,
      correctiveActions: [],
      photos: [],
    });
  });

  it("creates a checklist result locally with an outbox operation", async () => {
    const result = await saveChecklistResult({
      checklistItemId,
      comment: "  Sol OK  ",
      controlId,
      createId: createIdFactory([checklistResultId, mutationId, operationId]),
      database,
      now: () => now,
      status: "compliant",
      userId,
    });

    await expect(database.checklistResults.get(checklistResultId)).resolves.toEqual(
      result.record,
    );
    await expect(database.outbox.get(operationId)).resolves.toMatchObject({
      aggregateId: checklistResultId,
      entity: "checklistResults",
      organizationId,
      status: "pending",
    });
    expect(result.record).toMatchObject({
      comment: "Sol OK",
      status: "compliant",
    });
  });

  it("updates an existing checklist result while preserving its id", async () => {
    await database.checklistResults.put(createChecklistResult());

    const result = await saveChecklistResult({
      checklistItemId,
      controlId,
      createId: createIdFactory([mutationId, operationId]),
      database,
      now: () => later,
      status: "non_compliant",
      userId,
    });

    expect(result.record).toMatchObject({
      createdAt: now,
      id: checklistResultId,
      status: "non_compliant",
      updatedAt: later,
    });
    await expect(database.checklistResults.count()).resolves.toBe(1);
    await expect(database.outbox.get(operationId)).resolves.toMatchObject({
      aggregateId: checklistResultId,
      entity: "checklistResults",
    });
  });

  it("requires an authorized organization membership before saving", async () => {
    await database.organizationMembers.clear();

    await expect(
      saveChecklistResult({
        checklistItemId,
        controlId,
        database,
        status: "compliant",
        userId,
      }),
    ).rejects.toThrow("Organisation locale non autorisee");
    await expect(database.checklistResults.count()).resolves.toBe(0);
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

  it("formats checklist result labels", () => {
    expect(getChecklistResultStatusLabel("compliant")).toBe("Conforme");
    expect(getChecklistResultStatusLabel("non_compliant")).toBe("Non conforme");
    expect(getChecklistResultStatusLabel("not_applicable")).toBe(
      "Non applicable",
    );
  });
});
