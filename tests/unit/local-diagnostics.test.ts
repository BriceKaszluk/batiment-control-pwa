import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BatimentControlDatabase } from "@/lib/db/schema";
import { saveLocalMutation } from "@/lib/sync/local-mutation";
import { buildingSchema } from "@/lib/validation/schemas";
import {
  getLocalDiagnostics,
  getPendingSyncCount,
  getSyncErrorCount,
} from "@/features/settings/services/local-diagnostics";
import { saveControlPhoto } from "@/features/controls/services/local-control-photos";
import type {
  Building,
  Control,
  CorrectiveAction,
  OrganizationMember,
} from "@/types/domain";

const now = "2026-05-31T00:00:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const otherOrganizationId = "99999999-9999-4999-8999-999999999999";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";
const controlId = "44444444-4444-4444-8444-444444444444";
const completedControlId = "55555555-5555-4555-8555-555555555555";
const correctiveActionId = "66666666-6666-4666-8666-666666666666";
const photoId = "77777777-7777-4777-8777-777777777777";
const uploadId = "88888888-8888-4888-8888-888888888888";
const mutationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const operationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function createTestDatabase() {
  return new BatimentControlDatabase(
    `batiment-control-local-diagnostics-test-${Date.now()}-${Math.random()}`,
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

const correctiveAction: CorrectiveAction = {
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
};

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
      buildingCount: 0,
      completedControlCount: 0,
      draftControlCount: 0,
      localPhotoCount: 0,
      openCorrectiveActionCount: 0,
      organizationCount: 0,
    });
  });

  it("counts local scoped field data and sync queues", async () => {
    await database.organizationMembers.put(organizationMember);
    await database.buildings.bulkPut([
      building,
      {
        ...building,
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        organizationId: otherOrganizationId,
      },
    ]);
    await database.controls.bulkPut([
      createControl(),
      createControl({
        completedAt: now,
        id: completedControlId,
        status: "completed",
      }),
    ]);
    await database.correctiveActions.put(correctiveAction);
    await saveControlPhoto({
      blob: new Blob(["photo"], { type: "image/jpeg" }),
      controlId,
      createId: createIdFactory([photoId, uploadId]),
      database,
      fileName: "hall.jpg",
      now: () => now,
      userId,
    });
    await saveLocalMutation({
      clientMutationId: mutationId,
      createId: createIdFactory([operationId]),
      database,
      entity: "buildings",
      now: () => now,
      record: building,
      schema: buildingSchema,
      table: database.buildings,
    });

    const diagnostics = await getLocalDiagnostics({ database, userId });

    expect(diagnostics).toMatchObject({
      buildingCount: 1,
      completedControlCount: 1,
      draftControlCount: 1,
      localPhotoCount: 1,
      openCorrectiveActionCount: 1,
      organizationCount: 1,
      outbox: {
        pending: 1,
      },
      photoUploads: {
        pending: 1,
      },
    });
    expect(getPendingSyncCount(diagnostics)).toBe(2);
    expect(getSyncErrorCount(diagnostics)).toBe(0);
  });
});
