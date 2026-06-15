import "fake-indexeddb/auto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { hydrateRemoteControlPhotos } from "@/features/controls/services/remote-control-photos";
import { BatimentControlDatabase } from "@/lib/db/schema";
import type { Control, ControlPhoto, OrganizationMember } from "@/types/domain";
import type { Database } from "@/types/supabase";

type ControlPhotoRow = Database["public"]["Tables"]["control_photos"]["Row"];
type BrowserSupabaseClient = SupabaseClient<Database>;

const now = "2026-06-15T08:00:00.000Z";
const later = "2026-06-15T08:05:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";
const controlId = "44444444-4444-4444-8444-444444444444";
const photoId = "55555555-5555-4555-8555-555555555555";
const storagePath = `${organizationId}/${controlId}/${photoId}-hall.jpg`;

function createTestDatabase() {
  return new BatimentControlDatabase(
    `batiment-control-remote-photo-test-${Date.now()}-${Math.random()}`,
  );
}

const organizationMember: OrganizationMember = {
  createdAt: now,
  organizationId,
  role: "team_lead",
  userId,
};

const control: Control = {
  archivedAt: null,
  buildingId,
  completedAt: later,
  controlledBy: userId,
  createdAt: now,
  deletedAt: null,
  detailsPurgedAt: null,
  generalComment: null,
  id: controlId,
  organizationId,
  photosPurgedAt: null,
  qualityRating: "satisfying",
  startedAt: now,
  status: "completed",
  updatedAt: later,
};

const remotePhotoRow: ControlPhotoRow = {
  building_id: buildingId,
  caption: "Hall",
  control_id: controlId,
  created_at: now,
  created_by: userId,
  deleted_at: null,
  file_name: "hall.jpg",
  id: photoId,
  mime_type: "image/jpeg",
  organization_id: organizationId,
  size_bytes: 12,
  storage_bucket: "control-photos",
  storage_path: storagePath,
  updated_at: later,
  uploaded_at: later,
};

function createSupabaseClientStub({
  downloadBlob = new Blob(["remote-photo"], { type: "image/jpeg" }),
  rows = [remotePhotoRow],
}: {
  downloadBlob?: Blob;
  rows?: ControlPhotoRow[];
} = {}) {
  const downloadedPaths: string[] = [];
  const filters: Array<{ column: string; value: string | null }> = [];
  const query = {
    eq(column: string, value: string) {
      filters.push({ column, value });
      return this;
    },
    is(column: string, value: string | null) {
      filters.push({ column, value });
      return this;
    },
    order() {
      return Promise.resolve({ data: rows, error: null });
    },
    select() {
      return this;
    },
  };
  const client = {
    from(table: string) {
      expect(table).toBe("control_photos");
      return query;
    },
    storage: {
      from(bucket: string) {
        expect(bucket).toBe("control-photos");

        return {
          download(path: string) {
            downloadedPaths.push(path);

            return Promise.resolve({
              data: downloadBlob,
              error: null,
            });
          },
        };
      },
    },
  };

  return {
    client: client as unknown as BrowserSupabaseClient,
    downloadedPaths,
    filters,
  };
}

function createSyncedLocalPhoto(overrides: Partial<ControlPhoto> = {}): ControlPhoto {
  return {
    blob: new Blob(["cached-photo"], { type: "image/jpeg" }),
    buildingId,
    caption: "Hall",
    controlId,
    createdAt: now,
    createdBy: userId,
    deletedAt: null,
    fileName: "hall.jpg",
    id: photoId,
    mimeType: "image/jpeg",
    organizationId,
    remotePath: storagePath,
    sizeBytes: 12,
    updatedAt: later,
    uploadedAt: later,
    uploadStatus: "synced",
    ...overrides,
  };
}

describe("remote control photos", () => {
  let database: BatimentControlDatabase;

  beforeEach(async () => {
    database = createTestDatabase();
    await database.organizationMembers.put(organizationMember);
    await database.controls.put(control);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("downloads remote control photos and stores them locally", async () => {
    const { client, downloadedPaths, filters } = createSupabaseClientStub();

    const result = await hydrateRemoteControlPhotos({
      client,
      controlId,
      database,
      userId,
    });

    expect(result).toEqual({
      downloadedCount: 1,
      failedCount: 0,
      remoteCount: 1,
      skippedCount: 0,
    });
    expect(filters).toEqual(
      expect.arrayContaining([
        { column: "organization_id", value: organizationId },
        { column: "control_id", value: controlId },
        { column: "deleted_at", value: null },
      ]),
    );
    expect(downloadedPaths).toEqual([storagePath]);
    await expect(database.photoUploads.count()).resolves.toBe(0);

    const storedPhoto = await database.controlPhotos.get(photoId);

    expect(storedPhoto).toMatchObject({
      caption: "Hall",
      controlId,
      fileName: "hall.jpg",
      remotePath: storagePath,
      uploadStatus: "synced",
    });
    await expect(storedPhoto?.blob.text()).resolves.toBe("remote-photo");
  });

  it("keeps an existing synced local photo without downloading it again", async () => {
    await database.controlPhotos.put(createSyncedLocalPhoto());
    const { client, downloadedPaths } = createSupabaseClientStub();

    const result = await hydrateRemoteControlPhotos({
      client,
      controlId,
      database,
      userId,
    });

    expect(result).toEqual({
      downloadedCount: 0,
      failedCount: 0,
      remoteCount: 1,
      skippedCount: 1,
    });
    expect(downloadedPaths).toEqual([]);

    const storedPhoto = await database.controlPhotos.get(photoId);

    await expect(storedPhoto?.blob.text()).resolves.toBe("cached-photo");
  });

  it("does not hydrate photos without a local organization membership", async () => {
    await database.organizationMembers.clear();
    const { client, downloadedPaths } = createSupabaseClientStub();

    const result = await hydrateRemoteControlPhotos({
      client,
      controlId,
      database,
      userId,
    });

    expect(result).toEqual({
      downloadedCount: 0,
      failedCount: 0,
      remoteCount: 0,
      skippedCount: 0,
    });
    expect(downloadedPaths).toEqual([]);
  });
});
