"use client";

import type { BatimentControlDatabase } from "@/lib/db/schema";
import { db } from "@/lib/db/dexie";
import { createOutboxService } from "@/lib/sync/outbox";
import { createPhotoUploadQueueService } from "@/lib/sync/photo-upload-queue";
import type { OutboxStatusSummary } from "@/types/sync";

export type LocalDiagnostics = {
  buildingCount: number;
  completedControlCount: number;
  draftControlCount: number;
  localPhotoCount: number;
  openCorrectiveActionCount: number;
  organizationCount: number;
  outbox: OutboxStatusSummary;
  photoUploads: OutboxStatusSummary;
};

export type GetLocalDiagnosticsOptions = {
  database?: BatimentControlDatabase;
  userId: string | null;
};

const emptySummary: OutboxStatusSummary = {
  error: 0,
  pending: 0,
  processing: 0,
  synced: 0,
};

export async function getLocalDiagnostics({
  database = db,
  userId,
}: GetLocalDiagnosticsOptions): Promise<LocalDiagnostics> {
  const [outbox, photoUploads] = await Promise.all([
    createOutboxService(database).countByStatus(),
    createPhotoUploadQueueService(database).countByStatus(),
  ]);

  if (!userId) {
    return {
      ...createEmptyDiagnostics(),
      outbox,
      photoUploads,
    };
  }

  const organizationMembers = await database.organizationMembers
    .where("userId")
    .equals(userId)
    .toArray();
  const organizationIds = [
    ...new Set(organizationMembers.map((member) => member.organizationId)),
  ];

  if (organizationIds.length === 0) {
    return {
      ...createEmptyDiagnostics(),
      outbox,
      photoUploads,
    };
  }

  const [buildings, controls, correctiveActions, photos] = await Promise.all([
    database.buildings
      .where("organizationId")
      .anyOf(organizationIds)
      .filter((building) => building.deletedAt === null)
      .toArray(),
    database.controls
      .where("organizationId")
      .anyOf(organizationIds)
      .filter((control) => control.deletedAt === null)
      .toArray(),
    database.correctiveActions
      .where("organizationId")
      .anyOf(organizationIds)
      .filter((action) => action.deletedAt === null)
      .toArray(),
    database.controlPhotos
      .where("organizationId")
      .anyOf(organizationIds)
      .filter((photo) => photo.deletedAt === null)
      .toArray(),
  ]);

  return {
    buildingCount: buildings.length,
    completedControlCount: controls.filter(
      (control) => control.status === "completed",
    ).length,
    draftControlCount: controls.filter((control) => control.status === "draft")
      .length,
    localPhotoCount: photos.length,
    openCorrectiveActionCount: correctiveActions.filter(
      (action) => action.status === "open" || action.status === "in_progress",
    ).length,
    organizationCount: organizationIds.length,
    outbox,
    photoUploads,
  };
}

export function getPendingSyncCount(diagnostics: LocalDiagnostics) {
  return (
    diagnostics.outbox.pending +
    diagnostics.outbox.processing +
    diagnostics.photoUploads.pending +
    diagnostics.photoUploads.processing
  );
}

export function getSyncErrorCount(diagnostics: LocalDiagnostics) {
  return diagnostics.outbox.error + diagnostics.photoUploads.error;
}

function createEmptyDiagnostics(): LocalDiagnostics {
  return {
    buildingCount: 0,
    completedControlCount: 0,
    draftControlCount: 0,
    localPhotoCount: 0,
    openCorrectiveActionCount: 0,
    organizationCount: 0,
    outbox: emptySummary,
    photoUploads: emptySummary,
  };
}
