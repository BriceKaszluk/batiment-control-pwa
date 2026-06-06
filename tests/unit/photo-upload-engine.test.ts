import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BatimentControlDatabase } from "@/lib/db/schema";
import {
  createPhotoUploadSyncEngine,
  type RemotePhotoUploadAdapter,
} from "@/lib/sync/photo-upload-engine";
import { createPhotoUploadQueueService } from "@/lib/sync/photo-upload-queue";
import { saveControlPhoto } from "@/features/controls/services/local-control-photos";
import type { Building, Control, OrganizationMember } from "@/types/domain";

const now = "2026-05-31T00:00:00.000Z";
const uploadedAt = "2026-05-31T00:02:00.000Z";
const nextAttemptAt = "2026-05-31T00:01:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";
const controlId = "44444444-4444-4444-8444-444444444444";
const photoId = "55555555-5555-4555-8555-555555555555";
const uploadId = "66666666-6666-4666-8666-666666666666";

function createTestDatabase() {
  return new BatimentControlDatabase(
    `batiment-control-photo-upload-engine-test-${Date.now()}-${Math.random()}`,
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

describe("photo upload sync engine", () => {
  let database: BatimentControlDatabase;

  beforeEach(async () => {
    database = createTestDatabase();
    await database.organizationMembers.put(organizationMember);
    await database.buildings.put(building);
    await database.controls.put(control);
    await saveControlPhoto({
      blob: new Blob(["photo"], { type: "image/jpeg" }),
      controlId,
      createId: createIdFactory([photoId, uploadId]),
      database,
      fileName: "hall.jpg",
      now: () => now,
      userId,
    });
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("marks ready photo uploads as synced after a successful remote upload", async () => {
    const uploadedIds: string[] = [];
    const remote: RemotePhotoUploadAdapter = {
      async upload({ upload }) {
        uploadedIds.push(upload.id);

        return {
          remotePath: `${organizationId}/${controlId}/${photoId}-hall.jpg`,
          uploadedAt,
        };
      },
    };

    const result = await createPhotoUploadSyncEngine({
      queue: createPhotoUploadQueueService(database, { now: () => now }),
      remote,
    }).syncPending();

    expect(uploadedIds).toEqual([uploadId]);
    expect(result).toMatchObject({
      attempted: 1,
      failed: 0,
      synced: 1,
      totalReady: 1,
    });
    await expect(database.photoUploads.get(uploadId)).resolves.toMatchObject({
      status: "synced",
    });
    await expect(database.controlPhotos.get(photoId)).resolves.toMatchObject({
      remotePath: `${organizationId}/${controlId}/${photoId}-hall.jpg`,
      uploadedAt,
      uploadStatus: "synced",
    });
  });

  it("keeps failed photo uploads with a retry date", async () => {
    const remote: RemotePhotoUploadAdapter = {
      async upload() {
        throw new Error("Storage unavailable");
      },
    };

    const result = await createPhotoUploadSyncEngine({
      getNextAttemptAt: () => nextAttemptAt,
      queue: createPhotoUploadQueueService(database, { now: () => now }),
      remote,
    }).syncPending();

    expect(result).toMatchObject({
      attempted: 1,
      failed: 1,
      synced: 0,
    });
    await expect(database.photoUploads.get(uploadId)).resolves.toMatchObject({
      attemptCount: 1,
      lastError: "Storage unavailable",
      nextAttemptAt,
      status: "error",
    });
    await expect(database.controlPhotos.get(photoId)).resolves.toMatchObject({
      uploadStatus: "error",
    });
  });

  it("does not process photo uploads while offline", async () => {
    const result = await createPhotoUploadSyncEngine({
      isOnline: () => false,
      queue: createPhotoUploadQueueService(database, { now: () => now }),
      remote: {
        async upload() {
          throw new Error("Should not be called.");
        },
      },
    }).syncPending();

    expect(result).toMatchObject({
      attempted: 0,
      offline: true,
      totalReady: 0,
    });
    await expect(database.photoUploads.get(uploadId)).resolves.toMatchObject({
      status: "pending",
    });
  });
});
