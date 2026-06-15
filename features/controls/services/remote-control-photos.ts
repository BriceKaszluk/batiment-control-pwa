"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { db } from "@/lib/db/dexie";
import type { BatimentControlDatabase } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/client";
import { controlPhotoStorageBucket } from "@/lib/sync/supabase-photo-upload-adapter";
import { controlPhotoSchema } from "@/lib/validation/schemas";
import type { ControlPhoto } from "@/types/domain";
import type { Database } from "@/types/supabase";

type BrowserSupabaseClient = SupabaseClient<Database>;
type ControlPhotoRow = Database["public"]["Tables"]["control_photos"]["Row"];

export type HydrateRemoteControlPhotosOptions = {
  client?: BrowserSupabaseClient;
  controlId: string;
  database?: BatimentControlDatabase;
  userId: string | null;
};

export type HydrateRemoteControlPhotosResult = {
  downloadedCount: number;
  failedCount: number;
  remoteCount: number;
  skippedCount: number;
};

export async function hydrateRemoteControlPhotos({
  client = createClient(),
  controlId,
  database = db,
  userId,
}: HydrateRemoteControlPhotosOptions): Promise<HydrateRemoteControlPhotosResult> {
  const emptyResult: HydrateRemoteControlPhotosResult = {
    downloadedCount: 0,
    failedCount: 0,
    remoteCount: 0,
    skippedCount: 0,
  };

  if (!userId) {
    return emptyResult;
  }

  const control = await database.controls.get(controlId);

  if (!control || control.deletedAt !== null || control.photosPurgedAt !== null) {
    return emptyResult;
  }

  const membership = await database.organizationMembers.get([
    control.organizationId,
    userId,
  ]);

  if (!membership) {
    return emptyResult;
  }

  const remoteRows = await fetchRemoteControlPhotoRows(client, {
    controlId: control.id,
    organizationId: control.organizationId,
  });
  const result: HydrateRemoteControlPhotosResult = {
    ...emptyResult,
    remoteCount: remoteRows.length,
  };

  for (const row of remoteRows) {
    const existingPhoto = await database.controlPhotos.get(row.id);

    if (shouldSkipRemotePhoto(existingPhoto, row)) {
      result.skippedCount += 1;
      continue;
    }

    try {
      const blob = await downloadRemotePhotoBlob(client, row);
      const photo = toLocalControlPhoto(row, blob);

      await database.controlPhotos.put(photo);
      result.downloadedCount += 1;
    } catch {
      result.failedCount += 1;
    }
  }

  return result;
}

async function fetchRemoteControlPhotoRows(
  client: BrowserSupabaseClient,
  {
    controlId,
    organizationId,
  }: {
    controlId: string;
    organizationId: string;
  },
) {
  const { data, error } = await client
    .from("control_photos")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("control_id", controlId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  throwIfSupabaseError(error);

  return data ?? [];
}

async function downloadRemotePhotoBlob(
  client: BrowserSupabaseClient,
  row: ControlPhotoRow,
) {
  const { data, error } = await client.storage
    .from(controlPhotoStorageBucket)
    .download(row.storage_path);
  throwIfSupabaseError(error);

  if (!data) {
    throw new Error("Photo distante indisponible.");
  }

  return new Blob([await data.arrayBuffer()], { type: row.mime_type });
}

function toLocalControlPhoto(row: ControlPhotoRow, blob: Blob): ControlPhoto {
  return controlPhotoSchema.parse({
    blob,
    buildingId: row.building_id,
    caption: row.caption,
    controlId: row.control_id,
    createdAt: row.created_at,
    createdBy: row.created_by,
    deletedAt: row.deleted_at,
    fileName: row.file_name,
    id: row.id,
    mimeType: row.mime_type,
    organizationId: row.organization_id,
    remotePath: row.storage_path,
    sizeBytes: row.size_bytes,
    updatedAt: row.updated_at,
    uploadedAt: row.uploaded_at,
    uploadStatus: "synced",
  });
}

function shouldSkipRemotePhoto(
  existingPhoto: ControlPhoto | undefined,
  row: ControlPhotoRow,
) {
  if (!existingPhoto) {
    return false;
  }

  if (existingPhoto.uploadStatus !== "synced") {
    return true;
  }

  return (
    existingPhoto.remotePath === row.storage_path &&
    existingPhoto.deletedAt === row.deleted_at &&
    Date.parse(existingPhoto.updatedAt) >= Date.parse(row.updated_at)
  );
}

function throwIfSupabaseError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}
