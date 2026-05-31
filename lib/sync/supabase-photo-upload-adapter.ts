"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { RemotePhotoUploadAdapter } from "@/lib/sync/photo-upload-engine";
import type { ControlPhoto } from "@/types/domain";
import type { Database } from "@/types/supabase";

type PublicTables = Database["public"]["Tables"];
type BrowserSupabaseClient = SupabaseClient<Database>;

export const controlPhotoStorageBucket = "control-photos";

type SupabasePhotoUploadAdapterOptions = {
  client?: BrowserSupabaseClient;
  now?: () => string;
};

export function createSupabasePhotoUploadAdapter({
  client = createClient(),
  now = () => new Date().toISOString(),
}: SupabasePhotoUploadAdapterOptions = {}): RemotePhotoUploadAdapter {
  return {
    async upload({ photo }) {
      const storagePath = buildControlPhotoStoragePath(photo);
      const { error: storageError } = await client.storage
        .from(controlPhotoStorageBucket)
        .upload(storagePath, photo.blob, {
          contentType: photo.mimeType,
          upsert: true,
        });
      throwIfSupabaseError(storageError);

      const uploadedAt = now();
      const { error: rowError } = await client
        .from("control_photos")
        .upsert(toControlPhotoInsert(photo, storagePath, uploadedAt), {
          onConflict: "id",
        });
      throwIfSupabaseError(rowError);

      return {
        remotePath: storagePath,
        uploadedAt,
      };
    },
  };
}

export function buildControlPhotoStoragePath(photo: ControlPhoto) {
  return [
    photo.organizationId,
    photo.controlId,
    `${photo.id}-${sanitizeStorageFileName(photo.fileName)}`,
  ].join("/");
}

export function toControlPhotoInsert(
  photo: ControlPhoto,
  storagePath: string,
  uploadedAt: string,
): PublicTables["control_photos"]["Insert"] {
  return {
    building_id: photo.buildingId,
    caption: photo.caption,
    control_id: photo.controlId,
    created_at: photo.createdAt,
    created_by: photo.createdBy,
    deleted_at: photo.deletedAt,
    file_name: photo.fileName,
    id: photo.id,
    mime_type: photo.mimeType,
    organization_id: photo.organizationId,
    size_bytes: photo.sizeBytes,
    storage_bucket: controlPhotoStorageBucket,
    storage_path: storagePath,
    updated_at: photo.updatedAt,
    uploaded_at: uploadedAt,
  };
}

function sanitizeStorageFileName(fileName: string) {
  const sanitizedFileName = fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return sanitizedFileName || "photo";
}

function throwIfSupabaseError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}
