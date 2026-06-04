"use client";

import { maxLocalPhotoSizeBytes } from "@/features/controls/services/control-labels";
import type { BatimentControlDatabase } from "@/lib/db/schema";
import { db } from "@/lib/db/dexie";
import {
  controlPhotoSchema,
  photoMimeTypes,
  photoUploadSchema,
} from "@/lib/validation/schemas";
import type { ControlPhoto, PhotoUpload } from "@/types/domain";

export {
  getPhotoUploadStatusLabel,
  maxLocalPhotoSizeBytes,
} from "@/features/controls/services/control-labels";

export type LocalPhotoMutationResult = {
  photo: ControlPhoto;
  upload: PhotoUpload;
};

export type SaveControlPhotoOptions = {
  blob: Blob;
  caption?: string | null;
  clientMutationId?: string;
  controlId: string;
  createId?: () => string;
  database?: BatimentControlDatabase;
  fileName: string;
  now?: () => string;
  userId: string | null;
};

export async function saveControlPhoto({
  blob,
  caption = null,
  controlId,
  createId = () => crypto.randomUUID(),
  database = db,
  fileName,
  now = () => new Date().toISOString(),
  userId,
}: SaveControlPhotoOptions): Promise<LocalPhotoMutationResult> {
  if (!userId) {
    throw new Error("Utilisateur requis pour enregistrer une photo.");
  }

  if (!isAllowedPhotoMimeType(blob.type)) {
    throw new Error("Format photo non autorise.");
  }

  if (blob.size > maxLocalPhotoSizeBytes) {
    throw new Error("Photo trop volumineuse.");
  }

  const control = await database.controls.get(controlId);

  if (!control || control.deletedAt !== null) {
    throw new Error("Controle local introuvable.");
  }

  const membership = await database.organizationMembers.get([
    control.organizationId,
    userId,
  ]);

  if (!membership) {
    throw new Error("Organisation locale non autorisee.");
  }

  const timestamp = now();
  const photoId = createId();
  const photo = controlPhotoSchema.parse({
    blob,
    buildingId: control.buildingId,
    caption: normalizeCaption(caption),
    controlId: control.id,
    createdAt: timestamp,
    createdBy: userId,
    deletedAt: null,
    fileName,
    id: photoId,
    mimeType: blob.type,
    organizationId: control.organizationId,
    remotePath: null,
    sizeBytes: blob.size,
    updatedAt: timestamp,
    uploadedAt: null,
    uploadStatus: "pending",
  });
  const upload = photoUploadSchema.parse({
    attemptCount: 0,
    controlId: control.id,
    createdAt: timestamp,
    id: createId(),
    idempotencyKey: buildPhotoUploadIdempotencyKey(photo.id),
    lastError: null,
    nextAttemptAt: null,
    organizationId: control.organizationId,
    photoId: photo.id,
    status: "pending",
    updatedAt: timestamp,
  });

  await database.transaction(
    "rw",
    database.controlPhotos,
    database.photoUploads,
    async () => {
      const existingUpload = await database.photoUploads
        .where("idempotencyKey")
        .equals(upload.idempotencyKey)
        .first();

      if (existingUpload) {
        throw new Error("Photo deja en attente d'upload.");
      }

      await database.controlPhotos.add(photo);
      await database.photoUploads.add(upload);
    },
  );

  return { photo, upload };
}

export function buildPhotoUploadIdempotencyKey(photoId: string) {
  return `controlPhotos:${photoId}:upload`;
}

export function isAllowedPhotoMimeType(mimeType: string): boolean {
  return photoMimeTypes.includes(mimeType as (typeof photoMimeTypes)[number]);
}

function normalizeCaption(caption: string | null) {
  const trimmedCaption = caption?.trim();

  return trimmedCaption ? trimmedCaption : null;
}
