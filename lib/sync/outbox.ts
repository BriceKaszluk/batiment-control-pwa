"use client";

import type { Table } from "dexie";

import { db } from "@/lib/db/dexie";
import type { BatimentControlDatabase } from "@/lib/db/schema";
import { outboxOperationSchema } from "@/lib/validation/sync-schemas";
import type {
  CreateOutboxOperationInput,
  OutboxOperation,
  OutboxStatusSummary,
} from "@/types/sync";

type OutboxRuntimeOptions = {
  createId?: () => string;
  now?: () => string;
};

export type OutboxService = {
  countByStatus(): Promise<OutboxStatusSummary>;
  enqueue(input: CreateOutboxOperationInput): Promise<OutboxOperation>;
  getById(id: string): Promise<OutboxOperation | undefined>;
  getByIdempotencyKey(idempotencyKey: string): Promise<OutboxOperation | undefined>;
  listReady(limit?: number): Promise<OutboxOperation[]>;
  markError(
    id: string,
    errorMessage: string,
    nextAttemptAt?: string | null,
  ): Promise<OutboxOperation | undefined>;
  markProcessing(id: string): Promise<OutboxOperation | undefined>;
  markSynced(id: string): Promise<OutboxOperation | undefined>;
};

export function createOutboxService(
  database: BatimentControlDatabase = db,
  options: OutboxRuntimeOptions = {},
): OutboxService {
  const runtime = createRuntime(options);

  return {
    async countByStatus() {
      const [pending, processing, synced, error] = await Promise.all([
        database.outbox.where("status").equals("pending").count(),
        database.outbox.where("status").equals("processing").count(),
        database.outbox.where("status").equals("synced").count(),
        database.outbox.where("status").equals("error").count(),
      ]);

      return { error, pending, processing, synced };
    },

    async enqueue(input) {
      let operation: OutboxOperation | undefined;

      await database.transaction("rw", database.outbox, async () => {
        operation = await enqueueOutboxOperationInCurrentTransaction(
          database.outbox,
          input,
          runtime,
        );
      });

      return requireOperation(operation);
    },

    async getById(id) {
      return database.outbox.get(id);
    },

    async getByIdempotencyKey(idempotencyKey) {
      return database.outbox.where("idempotencyKey").equals(idempotencyKey).first();
    },

    async listReady(limit = 50) {
      const now = runtime.now();
      const readyOperations = await database.outbox
        .filter(
          (operation) =>
            operation.status === "pending" ||
            (operation.status === "error" &&
              (operation.nextAttemptAt === null || operation.nextAttemptAt <= now)),
        )
        .sortBy("createdAt");

      return readyOperations.slice(0, limit);
    },

    async markError(id, errorMessage, nextAttemptAt = null) {
      return updateOutboxOperation(database.outbox, id, (operation) => ({
        ...operation,
        attemptCount: operation.attemptCount + 1,
        lastError: errorMessage.slice(0, 2000),
        nextAttemptAt,
        status: "error",
        updatedAt: runtime.now(),
      }));
    },

    async markProcessing(id) {
      return updateOutboxOperation(database.outbox, id, (operation) => ({
        ...operation,
        status: "processing",
        updatedAt: runtime.now(),
      }));
    },

    async markSynced(id) {
      return updateOutboxOperation(database.outbox, id, (operation) => ({
        ...operation,
        lastError: null,
        nextAttemptAt: null,
        status: "synced",
        updatedAt: runtime.now(),
      }));
    },
  };
}

export async function enqueueOutboxOperationInCurrentTransaction(
  table: Table<OutboxOperation, string>,
  input: CreateOutboxOperationInput,
  options: Required<OutboxRuntimeOptions>,
): Promise<OutboxOperation> {
  const clientMutationId = input.clientMutationId ?? options.createId();
  const idempotencyKey = buildOutboxIdempotencyKey({
    aggregateId: input.aggregateId,
    clientMutationId,
    entity: input.entity,
    operationType: input.operationType,
  });
  const existingOperation = await table
    .where("idempotencyKey")
    .equals(idempotencyKey)
    .first();

  if (existingOperation) {
    return existingOperation;
  }

  const timestamp = options.now();
  const operation = outboxOperationSchema.parse({
    ...input,
    attemptCount: 0,
    clientMutationId,
    createdAt: timestamp,
    id: options.createId(),
    idempotencyKey,
    lastError: null,
    nextAttemptAt: null,
    status: "pending",
    updatedAt: timestamp,
  });

  await table.add(operation);

  return operation;
}

export function buildOutboxIdempotencyKey(input: {
  aggregateId: string;
  clientMutationId: string;
  entity: string;
  operationType: string;
}): string {
  return [
    input.entity,
    input.aggregateId,
    input.operationType,
    input.clientMutationId,
  ].join(":");
}

function createRuntime(options: OutboxRuntimeOptions): Required<OutboxRuntimeOptions> {
  return {
    createId: options.createId ?? (() => crypto.randomUUID()),
    now: options.now ?? (() => new Date().toISOString()),
  };
}

async function updateOutboxOperation(
  table: Table<OutboxOperation, string>,
  id: string,
  update: (operation: OutboxOperation) => OutboxOperation,
): Promise<OutboxOperation | undefined> {
  const existingOperation = await table.get(id);

  if (!existingOperation) {
    return undefined;
  }

  const updatedOperation = outboxOperationSchema.parse(update(existingOperation));
  await table.put(updatedOperation);

  return updatedOperation;
}

function requireOperation(
  operation: OutboxOperation | undefined,
): OutboxOperation {
  if (!operation) {
    throw new Error("Outbox operation was not created.");
  }

  return operation;
}
