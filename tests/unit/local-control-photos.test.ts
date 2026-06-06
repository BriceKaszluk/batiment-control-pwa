import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BatimentControlDatabase } from "@/lib/db/schema";
import {
  buildPhotoUploadIdempotencyKey,
  getPhotoUploadStatusLabel,
  maxLocalPhotoSizeBytes,
  saveControlPhoto,
} from "@/features/controls/services/local-control-photos";
import type { Building, Control, OrganizationMember } from "@/types/domain";

const now = "2026-05-31T00:00:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";
const controlId = "44444444-4444-4444-8444-444444444444";
const photoId = "55555555-5555-4555-8555-555555555555";
const uploadId = "66666666-6666-4666-8666-666666666666";

function createTestDatabase() {
  return new BatimentControlDatabase(
    `batiment-control-local-photo-test-${Date.now()}-${Math.random()}`,
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

function createPhotoBlob(options: { size?: number; type?: string } = {}) {
  return new Blob(["x".repeat(options.size ?? 12)], {
    type: options.type ?? "image/jpeg",
  });
}

describe("local control photos", () => {
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

  it("stores a photo locally with a pending upload operation", async () => {
    const blob = createPhotoBlob();

    const result = await saveControlPhoto({
      blob,
      caption: "  Hall entree  ",
      controlId,
      createId: createIdFactory([photoId, uploadId]),
      database,
      fileName: "hall.jpg",
      now: () => now,
      userId,
    });

    expect(result.photo).toMatchObject({
      blob,
      caption: "Hall entree",
      controlId,
      fileName: "hall.jpg",
      id: photoId,
      mimeType: "image/jpeg",
      organizationId,
      remotePath: null,
      uploadStatus: "pending",
    });
    expect(result.upload).toMatchObject({
      id: uploadId,
      idempotencyKey: buildPhotoUploadIdempotencyKey(photoId),
      photoId,
      status: "pending",
    });
    await expect(database.controlPhotos.get(photoId)).resolves.toEqual(
      result.photo,
    );
    await expect(database.photoUploads.get(uploadId)).resolves.toEqual(
      result.upload,
    );
  });

  it("rejects unsupported formats without writing local data", async () => {
    await expect(
      saveControlPhoto({
        blob: createPhotoBlob({ type: "application/pdf" }),
        controlId,
        database,
        fileName: "controle.pdf",
        userId,
      }),
    ).rejects.toThrow("Format photo non autorise");
    await expect(database.controlPhotos.count()).resolves.toBe(0);
    await expect(database.photoUploads.count()).resolves.toBe(0);
  });

  it("rejects oversized photos without writing local data", async () => {
    await expect(
      saveControlPhoto({
        blob: createPhotoBlob({ size: maxLocalPhotoSizeBytes + 1 }),
        controlId,
        database,
        fileName: "hall.jpg",
        userId,
      }),
    ).rejects.toThrow("Photo trop volumineuse");
    await expect(database.controlPhotos.count()).resolves.toBe(0);
    await expect(database.photoUploads.count()).resolves.toBe(0);
  });

  it("requires an authorized organization membership before saving", async () => {
    await database.organizationMembers.clear();

    await expect(
      saveControlPhoto({
        blob: createPhotoBlob(),
        controlId,
        database,
        fileName: "hall.jpg",
        userId,
      }),
    ).rejects.toThrow("Organisation locale non autorisee");
    await expect(database.controlPhotos.count()).resolves.toBe(0);
    await expect(database.photoUploads.count()).resolves.toBe(0);
  });

  it("formats upload status labels", () => {
    expect(getPhotoUploadStatusLabel("pending")).toBe("Upload en attente");
    expect(getPhotoUploadStatusLabel("processing")).toBe("Upload en cours");
    expect(getPhotoUploadStatusLabel("synced")).toBe("Upload termine");
    expect(getPhotoUploadStatusLabel("error")).toBe("Erreur upload");
  });
});
