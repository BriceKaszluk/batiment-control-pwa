"use client";

import type { Table } from "dexie";
import type { z } from "zod";

import type { BatimentControlDatabase } from "@/lib/db/schema";
import {
  enqueueOutboxOperationInCurrentTransaction,
  type OutboxService,
} from "@/lib/sync/outbox";
import { parseOutboxPayload } from "@/lib/validation/sync-schemas";
import type {
  LocalMutationResult,
  OutboxOperationType,
  SynchronizableEntity,
} from "@/types/sync";

export type OrganizationScopedRecord = {
  id: string;
  organizationId: string;
};

export type SaveLocalMutationOptions<TEntity extends OrganizationScopedRecord> = {
  clientMutationId?: string;
  createId?: () => string;
  database: BatimentControlDatabase;
  entity: SynchronizableEntity;
  operationType?: OutboxOperationType;
  now?: () => string;
  record: TEntity;
  schema: z.ZodType<TEntity>;
  table: Table<TEntity, string>;
};

export async function saveLocalMutation<
  TEntity extends OrganizationScopedRecord,
>({
  clientMutationId,
  createId = () => crypto.randomUUID(),
  database,
  entity,
  now = () => new Date().toISOString(),
  operationType = "upsert",
  record,
  schema,
  table,
}: SaveLocalMutationOptions<TEntity>): Promise<LocalMutationResult<TEntity>> {
  const parsedRecord = schema.parse(record);
  let result: LocalMutationResult<TEntity> | undefined;

  await database.transaction("rw", table, database.outbox, async () => {
    await table.put(parsedRecord);

    const outboxOperation = await enqueueOutboxOperationInCurrentTransaction(
      database.outbox,
      {
        aggregateId: parsedRecord.id,
        clientMutationId,
        entity,
        operationType,
        organizationId: parsedRecord.organizationId,
        payload: parseOutboxPayload(parsedRecord),
      },
      { createId, now },
    );

    result = {
      outboxOperation,
      record: parsedRecord,
    };
  });

  if (!result) {
    throw new Error("Local mutation was not saved.");
  }

  return result;
}

export type { OutboxService };
