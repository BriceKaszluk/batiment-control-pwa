"use client";

import {
  createPhotoUploadQueueService,
  type PhotoUploadQueueService,
  type ReadyPhotoUpload,
} from "@/lib/sync/photo-upload-queue";
import { getDefaultNextAttemptAt, type SyncEngineResult } from "@/lib/sync/sync-engine";

export type RemotePhotoUploadAdapter = {
  upload(item: ReadyPhotoUpload): Promise<{
    remotePath: string;
    uploadedAt: string;
  }>;
};

type PhotoUploadSyncEngineOptions = {
  getNextAttemptAt?: (attemptCount: number, now: string) => string;
  isOnline?: () => boolean;
  limit?: number;
  now?: () => string;
  queue?: PhotoUploadQueueService;
  remote: RemotePhotoUploadAdapter;
};

export type PhotoUploadSyncEngine = {
  syncPending(): Promise<SyncEngineResult>;
};

export function createPhotoUploadSyncEngine({
  getNextAttemptAt = getDefaultNextAttemptAt,
  isOnline = () => true,
  limit = 10,
  now = () => new Date().toISOString(),
  queue = createPhotoUploadQueueService(),
  remote,
}: PhotoUploadSyncEngineOptions): PhotoUploadSyncEngine {
  return {
    async syncPending() {
      if (!isOnline()) {
        return createEmptyPhotoUploadSyncResult(true);
      }

      const items = await queue.listReady(limit);
      const result: SyncEngineResult = {
        attempted: 0,
        errors: [],
        failed: 0,
        offline: false,
        skipped: 0,
        synced: 0,
        totalReady: items.length,
      };

      for (const item of items) {
        const processingUpload = await queue.markProcessing(item.upload.id);

        if (!processingUpload) {
          result.skipped += 1;
          continue;
        }

        result.attempted += 1;

        try {
          const uploadResult = await remote.upload({
            photo: item.photo,
            upload: processingUpload,
          });

          await queue.markSynced({
            id: processingUpload.id,
            remotePath: uploadResult.remotePath,
            uploadedAt: uploadResult.uploadedAt,
          });
          result.synced += 1;
        } catch (error) {
          const message = getErrorMessage(error);
          const nextAttemptAt = getNextAttemptAt(
            processingUpload.attemptCount + 1,
            now(),
          );

          await queue.markError(processingUpload.id, message, nextAttemptAt);
          result.failed += 1;
          result.errors.push({
            message,
            operationId: processingUpload.id,
          });
        }
      }

      return result;
    },
  };
}

export function mergeSyncResults(
  firstResult: SyncEngineResult,
  secondResult: SyncEngineResult,
): SyncEngineResult {
  return {
    attempted: firstResult.attempted + secondResult.attempted,
    errors: [...firstResult.errors, ...secondResult.errors],
    failed: firstResult.failed + secondResult.failed,
    offline: firstResult.offline || secondResult.offline,
    skipped: firstResult.skipped + secondResult.skipped,
    synced: firstResult.synced + secondResult.synced,
    totalReady: firstResult.totalReady + secondResult.totalReady,
  };
}

function createEmptyPhotoUploadSyncResult(offline: boolean): SyncEngineResult {
  return {
    attempted: 0,
    errors: [],
    failed: 0,
    offline,
    skipped: 0,
    synced: 0,
    totalReady: 0,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Erreur upload photo";
}
