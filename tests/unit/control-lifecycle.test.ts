import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BatimentControlDatabase } from "@/lib/db/schema";
import {
  applyControlLifecyclePolicy,
  getControlLifecyclePreview,
} from "@/features/controls/services/control-lifecycle";
import type {
  Building,
  Control,
  ControlPhoto,
  CorrectiveAction,
  OrganizationMember,
} from "@/types/domain";

const now = "2026-06-06T00:00:00.000Z";
const old = "2026-01-01T00:00:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";
const controlId = "44444444-4444-4444-8444-444444444444";
const photoId = "55555555-5555-4555-8555-555555555555";

function createTestDatabase() {
  return new BatimentControlDatabase(
    `batiment-control-lifecycle-test-${Date.now()}-${Math.random()}`,
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
  createdAt: old,
  createdBy: userId,
  deletedAt: null,
  id: buildingId,
  internalNotes: null,
  lastControlAt: old,
  name: "Batiment A",
  organizationId,
  priorityLevel: "normal",
  sector: "Secteur Nord",
  serviceDays: [],
  updatedAt: old,
};

function createCompletedControl(overrides: Partial<Control> = {}): Control {
  return {
    archivedAt: null,
    buildingId,
    completedAt: old,
    controlledBy: userId,
    createdAt: old,
    deletedAt: null,
    detailsPurgedAt: null,
    generalComment: "Controle archive",
    id: controlId,
    organizationId,
    photosPurgedAt: null,
    qualityRating: "acceptable",
    startedAt: old,
    status: "completed",
    updatedAt: old,
    ...overrides,
  };
}

function createPhoto(overrides: Partial<ControlPhoto> = {}): ControlPhoto {
  return {
    blob: new Blob(["photo"], { type: "image/jpeg" }),
    buildingId,
    caption: null,
    controlId,
    createdAt: old,
    createdBy: userId,
    deletedAt: null,
    fileName: "hall.jpg",
    id: photoId,
    mimeType: "image/jpeg",
    organizationId,
    remotePath: `${organizationId}/${controlId}/${photoId}-hall.jpg`,
    sizeBytes: 5,
    updatedAt: old,
    uploadedAt: old,
    uploadStatus: "synced",
    ...overrides,
  };
}

describe("control lifecycle", () => {
  let database: BatimentControlDatabase;

  beforeEach(async () => {
    database = createTestDatabase();
    await database.organizationMembers.put(organizationMember);
    await database.buildings.put(building);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("archives old completed controls and stores a lightweight summary", async () => {
    await database.controls.put(createCompletedControl());

    const result = await applyControlLifecyclePolicy({
      createId: createIdFactory([
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      ]),
      database,
      now: () => now,
      policy: {
        archiveAfterDays: 90,
        purgePhotosAfterDays: 90,
      },
      userId,
    });

    expect(result).toMatchObject({
      archivedNowCount: 1,
      photoPurgedNowCount: 0,
      summarizedNowCount: 1,
    });
    await expect(database.controls.get(controlId)).resolves.toMatchObject({
      archivedAt: now,
      updatedAt: now,
    });
    await expect(database.controlSummaries.get(controlId)).resolves.toMatchObject({
      buildingName: "Batiment A",
      controlId,
      qualityRating: "acceptable",
    });
    await expect(database.outbox.toArray()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entity: "controlSummaries" }),
        expect.objectContaining({ entity: "controls" }),
      ]),
    );
  });

  it("purges synced remote photos through the outbox", async () => {
    await database.controls.put(createCompletedControl({ archivedAt: old }));
    await database.controlPhotos.put(createPhoto());

    const result = await applyControlLifecyclePolicy({
      createId: createIdFactory([
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      ]),
      database,
      now: () => now,
      policy: {
        archiveAfterDays: 90,
        purgePhotosAfterDays: 90,
      },
      userId,
    });

    expect(result.photoPurgedNowCount).toBe(1);
    await expect(database.controlPhotos.get(photoId)).resolves.toMatchObject({
      deletedAt: now,
      updatedAt: now,
    });
    await expect(database.controls.get(controlId)).resolves.toMatchObject({
      photosPurgedAt: now,
      updatedAt: now,
    });
    await expect(
      database.outbox.where("entity").equals("controlPhotos").first(),
    ).resolves.toMatchObject({
      aggregateId: photoId,
      operationType: "delete",
      payload: {
        deletedAt: now,
        id: photoId,
        organizationId,
        remotePath: `${organizationId}/${controlId}/${photoId}-hall.jpg`,
        updatedAt: now,
      },
    });
  });

  it("does not archive or purge a control with an open corrective action", async () => {
    const action: CorrectiveAction = {
      assignedTo: null,
      buildingId,
      controlId,
      createdAt: old,
      createdBy: userId,
      deletedAt: null,
      description: null,
      dueDate: null,
      id: "66666666-6666-4666-8666-666666666666",
      organizationId,
      priority: "normal",
      resolvedAt: null,
      status: "open",
      title: "Reprise hall",
      updatedAt: old,
    };

    await database.controls.put(createCompletedControl());
    await database.correctiveActions.put(action);

    await expect(
      getControlLifecyclePreview({ database, now: () => now, userId }),
    ).resolves.toMatchObject({
      blockedControlCount: 1,
    });

    const result = await applyControlLifecyclePolicy({
      database,
      now: () => now,
      userId,
    });

    expect(result.archivedNowCount).toBe(0);
    await expect(database.controls.get(controlId)).resolves.toMatchObject({
      archivedAt: null,
      photosPurgedAt: null,
    });
    await expect(database.outbox.count()).resolves.toBe(0);
  });
});
