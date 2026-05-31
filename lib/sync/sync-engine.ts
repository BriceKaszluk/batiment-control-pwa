"use client";

import { createOutboxService, type OutboxService } from "@/lib/sync/outbox";
import type { OutboxOperation } from "@/types/sync";

export type RemoteSyncAdapter = {
  push(operation: OutboxOperation): Promise<void>;
};

export type SyncOperationError = {
  message: string;
  operationId: string;
};

export type SyncEngineResult = {
  attempted: number;
  errors: SyncOperationError[];
  failed: number;
  offline: boolean;
  skipped: number;
  synced: number;
  totalReady: number;
};

type SyncBackoffStrategy = (attemptCount: number, now: string) => string;

type SyncEngineOptions = {
  getNextAttemptAt?: SyncBackoffStrategy;
  isOnline?: () => boolean;
  limit?: number;
  now?: () => string;
  outbox?: OutboxService;
  remote: RemoteSyncAdapter;
};

export type SyncEngine = {
  syncPending(): Promise<SyncEngineResult>;
};

const defaultLimit = 25;

export function createSyncEngine({
  getNextAttemptAt = getDefaultNextAttemptAt,
  isOnline = () => true,
  limit = defaultLimit,
  now = () => new Date().toISOString(),
  outbox = createOutboxService(),
  remote,
}: SyncEngineOptions): SyncEngine {
  return {
    async syncPending() {
      if (!isOnline()) {
        return createEmptySyncResult({ offline: true });
      }

      const operations = await outbox.listReady(limit);
      const result: SyncEngineResult = {
        attempted: 0,
        errors: [],
        failed: 0,
        offline: false,
        skipped: 0,
        synced: 0,
        totalReady: operations.length,
      };

      for (const operation of operations) {
        const processingOperation = await outbox.markProcessing(operation.id);

        if (!processingOperation) {
          result.skipped += 1;
          continue;
        }

        result.attempted += 1;

        try {
          await remote.push(processingOperation);
          await outbox.markSynced(processingOperation.id);
          result.synced += 1;
        } catch (error) {
          const message = getErrorMessage(error);
          const nextAttemptAt = getNextAttemptAt(
            processingOperation.attemptCount + 1,
            now(),
          );

          await outbox.markError(
            processingOperation.id,
            message,
            nextAttemptAt,
          );
          result.failed += 1;
          result.errors.push({
            message,
            operationId: processingOperation.id,
          });
        }
      }

      return result;
    },
  };
}

export function getDefaultNextAttemptAt(attemptCount: number, now: string) {
  const baseTimestamp = Date.parse(now);
  const timestamp = Number.isNaN(baseTimestamp) ? Date.now() : baseTimestamp;
  const boundedAttemptCount = Math.max(1, Math.min(attemptCount, 6));
  const delayInMinutes = 2 ** (boundedAttemptCount - 1);

  return new Date(timestamp + delayInMinutes * 60_000).toISOString();
}

function createEmptySyncResult(input: { offline: boolean }): SyncEngineResult {
  return {
    attempted: 0,
    errors: [],
    failed: 0,
    offline: input.offline,
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

  return "Erreur de synchronisation";
}
