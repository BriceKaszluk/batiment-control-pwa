import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BatimentControlDatabase } from "@/lib/db/schema";
import { createOutboxService } from "@/lib/sync/outbox";
import { createPhotoUploadQueueService } from "@/lib/sync/photo-upload-queue";
import { getOutboxStatusSummary } from "@/features/sync/services/outbox-summary";
import { saveControlPhoto } from "@/features/controls/services/local-control-photos";
import type { Building, Control, OrganizationMember } from "@/types/domain";

const now = "2026-05-31T00:00:00.000Z";
const later = "2026-05-31T01:00:00.000Z";
const nextAttemptAt = "2026-05-31T00:01:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";
const controlId = "44444444-4444-4444-8444-444444444444";
const photoId = "55555555-5555-4555-8555-555555555555";
const uploadId = "66666666-6666-4666-8666-666666666666";
const mutationId = "77777777-7777-4777-8777-777777777777";
const outboxOperationId = "88888888-8888-4888-8888-888888888888";

function createTestDatabase() {
  return new BatimentControlDatabase(
    `batiment-control-photo-upload-queue-test-${Date.now()}-${Math.random()}`,
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

describe("photo upload queue", () => {
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

  it("counts and lists ready photo uploads", async () => {
    const queue = createPhotoUploadQueueService(database, { now: () => now });

    await expect(queue.countByStatus()).resolves.toEqual({
      error: 0,
      pending: 1,
      processing: 0,
      synced: 0,
    });
    await expect(queue.listReady()).resolves.toMatchObject([
      {
        photo: { id: photoId },
        upload: { id: uploadId, status: "pending" },
      },
    ]);
  });

  it("tracks processing, error and synced states on uploads and photos", async () => {
    const queue = createPhotoUploadQueueService(database, { now: () => later });

    await expect(queue.markProcessing(uploadId)).resolves.toMatchObject({
      id: uploadId,
      status: "processing",
    });
    await expect(database.controlPhotos.get(photoId)).resolves.toMatchObject({
      uploadStatus: "processing",
    });

    await expect(
      queue.markError(uploadId, "Storage unavailable", nextAttemptAt),
    ).resolves.toMatchObject({
      attemptCount: 1,
      lastError: "Storage unavailable",
      nextAttemptAt,
      status: "error",
    });
    await expect(database.controlPhotos.get(photoId)).resolves.toMatchObject({
      uploadStatus: "error",
    });

    await expect(
      queue.markSynced({
        id: uploadId,
        remotePath: `${organizationId}/${controlId}/hall.jpg`,
        uploadedAt: later,
      }),
    ).resolves.toMatchObject({
      lastError: null,
      nextAttemptAt: null,
      status: "synced",
    });
    await expect(database.controlPhotos.get(photoId)).resolves.toMatchObject({
      remotePath: `${organizationId}/${controlId}/hall.jpg`,
      uploadedAt: later,
      uploadStatus: "synced",
    });
  });

  it("combines regular outbox and photo upload counts for sync status", async () => {
    const outbox = createOutboxService(database, {
      createId: createIdFactory([outboxOperationId]),
      now: () => now,
    });
    const photoQueue = createPhotoUploadQueueService(database, { now: () => now });

    await outbox.enqueue({
      aggregateId: buildingId,
      clientMutationId: mutationId,
      entity: "buildings",
      operationType: "upsert",
      organizationId,
      payload: building,
    });

    await expect(getOutboxStatusSummary(outbox, photoQueue)).resolves.toEqual({
      error: 0,
      pending: 2,
      processing: 0,
      synced: 0,
    });
  });
});
