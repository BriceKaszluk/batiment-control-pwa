import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BatimentControlDatabase } from "@/lib/db/schema";
import {
  createCorrectiveActionForControl,
  getCorrectiveActionPriorityLabel,
  getCorrectiveActionStatusLabel,
  listCorrectiveActionsForUser,
  updateCorrectiveActionStatus,
} from "@/features/corrective-actions/services/local-corrective-actions";
import type {
  Building,
  Control,
  CorrectiveAction,
  OrganizationMember,
} from "@/types/domain";

const now = "2026-05-31T00:00:00.000Z";
const later = "2026-05-31T01:00:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const otherOrganizationId = "99999999-9999-4999-8999-999999999999";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";
const controlId = "44444444-4444-4444-8444-444444444444";
const correctiveActionId = "55555555-5555-4555-8555-555555555555";
const secondCorrectiveActionId = "66666666-6666-4666-8666-666666666666";
const mutationId = "77777777-7777-4777-8777-777777777777";
const operationId = "88888888-8888-4888-8888-888888888888";

function createTestDatabase() {
  return new BatimentControlDatabase(
    `batiment-control-local-corrective-actions-test-${Date.now()}-${Math.random()}`,
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

function createCorrectiveAction(
  overrides: Partial<CorrectiveAction> = {},
): CorrectiveAction {
  return {
    assignedTo: null,
    buildingId,
    controlId,
    createdAt: now,
    createdBy: userId,
    deletedAt: null,
    description: null,
    dueDate: null,
    id: correctiveActionId,
    organizationId,
    priority: "normal",
    resolvedAt: null,
    status: "open",
    title: "Reprendre le hall",
    updatedAt: now,
    ...overrides,
  };
}

describe("local corrective actions", () => {
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

  it("creates a corrective action locally with an outbox operation", async () => {
    const result = await createCorrectiveActionForControl({
      controlId,
      createId: createIdFactory([correctiveActionId, mutationId, operationId]),
      database,
      description: "  Traces au sol  ",
      dueDate: "2026-06-01",
      now: () => now,
      priority: "high",
      title: "  Reprendre le hall  ",
      userId,
    });

    expect(result.record).toMatchObject({
      buildingId,
      controlId,
      description: "Traces au sol",
      dueDate: "2026-06-01",
      id: correctiveActionId,
      priority: "high",
      status: "open",
      title: "Reprendre le hall",
    });
    await expect(database.correctiveActions.get(correctiveActionId)).resolves.toEqual(
      result.record,
    );
    await expect(database.outbox.get(operationId)).resolves.toMatchObject({
      aggregateId: correctiveActionId,
      entity: "correctiveActions",
      organizationId,
      status: "pending",
    });
  });

  it("lists open corrective actions for the current user's organizations", async () => {
    const highPriorityAction = createCorrectiveAction({
      dueDate: "2026-06-01",
      priority: "high",
    });
    const normalPriorityAction = createCorrectiveAction({
      id: secondCorrectiveActionId,
      priority: "normal",
      title: "Reprendre les sanitaires",
    });
    const closedAction = createCorrectiveAction({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      resolvedAt: later,
      status: "done",
    });
    const otherOrganizationAction = createCorrectiveAction({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      organizationId: otherOrganizationId,
    });

    await database.correctiveActions.bulkPut([
      normalPriorityAction,
      closedAction,
      otherOrganizationAction,
      highPriorityAction,
    ]);

    await expect(
      listCorrectiveActionsForUser({ database, userId }),
    ).resolves.toEqual([
      { action: highPriorityAction, building },
      { action: normalPriorityAction, building },
    ]);
  });

  it("updates a corrective action status locally with an outbox operation", async () => {
    await database.correctiveActions.put(createCorrectiveAction());

    const result = await updateCorrectiveActionStatus({
      actionId: correctiveActionId,
      createId: createIdFactory([mutationId, operationId]),
      database,
      now: () => later,
      status: "done",
      userId,
    });

    expect(result.record).toMatchObject({
      id: correctiveActionId,
      resolvedAt: later,
      status: "done",
      updatedAt: later,
    });
    await expect(database.outbox.get(operationId)).resolves.toMatchObject({
      aggregateId: correctiveActionId,
      entity: "correctiveActions",
      status: "pending",
    });
  });

  it("requires an authorized organization membership before creating", async () => {
    await database.organizationMembers.clear();

    await expect(
      createCorrectiveActionForControl({
        controlId,
        database,
        priority: "normal",
        title: "Reprendre le hall",
        userId,
      }),
    ).rejects.toThrow("Organisation locale non autorisee");
    await expect(database.correctiveActions.count()).resolves.toBe(0);
    await expect(database.outbox.count()).resolves.toBe(0);
  });

  it("formats corrective action labels", () => {
    expect(getCorrectiveActionPriorityLabel("high")).toBe("Haute");
    expect(getCorrectiveActionPriorityLabel("normal")).toBe("Normale");
    expect(getCorrectiveActionPriorityLabel("low")).toBe("Basse");
    expect(getCorrectiveActionStatusLabel("open")).toBe("Ouverte");
    expect(getCorrectiveActionStatusLabel("in_progress")).toBe("En cours");
    expect(getCorrectiveActionStatusLabel("done")).toBe("Terminee");
    expect(getCorrectiveActionStatusLabel("canceled")).toBe("Annulee");
  });
});
