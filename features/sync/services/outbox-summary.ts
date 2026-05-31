"use client";

import { createOutboxService, type OutboxService } from "@/lib/sync/outbox";
import {
  createPhotoUploadQueueService,
  type PhotoUploadQueueService,
} from "@/lib/sync/photo-upload-queue";
import type { OutboxStatusSummary } from "@/types/sync";

export async function getOutboxStatusSummary(
  service: OutboxService = createOutboxService(),
  photoUploadQueue: PhotoUploadQueueService = createPhotoUploadQueueService(),
): Promise<OutboxStatusSummary> {
  const [outboxSummary, photoUploadSummary] = await Promise.all([
    service.countByStatus(),
    photoUploadQueue.countByStatus(),
  ]);

  return {
    error: outboxSummary.error + photoUploadSummary.error,
    pending: outboxSummary.pending + photoUploadSummary.pending,
    processing: outboxSummary.processing + photoUploadSummary.processing,
    synced: outboxSummary.synced + photoUploadSummary.synced,
  };
}
