"use client";

import { db } from "@/lib/db/dexie";
import type { BatimentControlDatabase } from "@/lib/db/schema";
import {
  controlPhotoSchema,
  photoUploadSchema,
} from "@/lib/validation/schemas";
import type { ControlPhoto, PhotoUpload } from "@/types/domain";
import type { OutboxStatusSummary } from "@/types/sync";

type PhotoUploadRuntimeOptions = {
  now?: () => string;
};

export type ReadyPhotoUpload = {
  photo: ControlPhoto;
  upload: PhotoUpload;
};

export type PhotoUploadQueueService = {
  countByStatus(): Promise<OutboxStatusSummary>;
  getById(id: string): Promise<PhotoUpload | undefined>;
  listReady(limit?: number): Promise<ReadyPhotoUpload[]>;
  markError(
    id: string,
    errorMessage: string,
    nextAttemptAt?: string | null,
  ): Promise<PhotoUpload | undefined>;
  markProcessing(id: string): Promise<PhotoUpload | undefined>;
  markSynced(input: {
    id: string;
    remotePath: string;
    uploadedAt: string;
  }): Promise<PhotoUpload | undefined>;
};

export function createPhotoUploadQueueService(
  database: BatimentControlDatabase = db,
  options: PhotoUploadRuntimeOptions = {},
): PhotoUploadQueueService {
  const now = options.now ?? (() => new Date().toISOString());

  return {
    async countByStatus() {
      const [pending, processing, synced, error] = await Promise.all([
        database.photoUploads.where("status").equals("pending").count(),
        database.photoUploads.where("status").equals("processing").count(),
        database.photoUploads.where("status").equals("synced").count(),
        database.photoUploads.where("status").equals("error").count(),
      ]);

      return { error, pending, processing, synced };
    },

    async getById(id) {
      return database.photoUploads.get(id);
    },

    async listReady(limit = 25) {
      const timestamp = now();
      const readyUploads = await database.photoUploads
        .filter(
          (upload) =>
            upload.status === "pending" ||
            (upload.status === "error" &&
              (upload.nextAttemptAt === null ||
                upload.nextAttemptAt <= timestamp)),
        )
        .sortBy("createdAt");
      const limitedUploads = readyUploads.slice(0, limit);
      const readyItems = await Promise.all(
        limitedUploads.map(async (upload) => ({
          photo: await database.controlPhotos.get(upload.photoId),
          upload,
        })),
      );

      return readyItems.flatMap((item) =>
        item.photo && item.photo.deletedAt === null
          ? [{ photo: item.photo, upload: item.upload }]
          : [],
      );
    },

    async markError(id, errorMessage, nextAttemptAt = null) {
      return updatePhotoUpload(database, id, (photo, upload) => ({
        photo: {
          ...photo,
          updatedAt: now(),
          uploadStatus: "error",
        },
        upload: {
          ...upload,
          attemptCount: upload.attemptCount + 1,
          lastError: errorMessage.slice(0, 2000),
          nextAttemptAt,
          status: "error",
          updatedAt: now(),
        },
      }));
    },

    async markProcessing(id) {
      return updatePhotoUpload(database, id, (photo, upload) => ({
        photo: {
          ...photo,
          updatedAt: now(),
          uploadStatus: "processing",
        },
        upload: {
          ...upload,
          status: "processing",
          updatedAt: now(),
        },
      }));
    },

    async markSynced({ id, remotePath, uploadedAt }) {
      return updatePhotoUpload(database, id, (photo, upload) => ({
        photo: {
          ...photo,
          remotePath,
          updatedAt: now(),
          uploadedAt,
          uploadStatus: "synced",
        },
        upload: {
          ...upload,
          lastError: null,
          nextAttemptAt: null,
          status: "synced",
          updatedAt: now(),
        },
      }));
    },
  };
}

async function updatePhotoUpload(
  database: BatimentControlDatabase,
  id: string,
  update: (
    photo: ControlPhoto,
    upload: PhotoUpload,
  ) => { photo: ControlPhoto; upload: PhotoUpload },
): Promise<PhotoUpload | undefined> {
  let updatedUpload: PhotoUpload | undefined;

  await database.transaction(
    "rw",
    database.controlPhotos,
    database.photoUploads,
    async () => {
      const upload = await database.photoUploads.get(id);

      if (!upload) {
        return;
      }

      const photo = await database.controlPhotos.get(upload.photoId);

      if (!photo) {
        return;
      }

      const nextRecords = update(photo, upload);
      const parsedPhoto = controlPhotoSchema.parse(nextRecords.photo);
      const parsedUpload = photoUploadSchema.parse(nextRecords.upload);

      await database.controlPhotos.put(parsedPhoto);
      await database.photoUploads.put(parsedUpload);
      updatedUpload = parsedUpload;
    },
  );

  return updatedUpload;
}
