import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BatimentControlDatabase } from "@/lib/db/schema";
import { createOutboxService } from "@/lib/sync/outbox";
import {
  createSyncEngine,
  getDefaultNextAttemptAt,
  type RemoteSyncAdapter,
} from "@/lib/sync/sync-engine";
import type { Building } from "@/types/domain";

const now = "2026-05-31T00:00:00.000Z";
const nextAttemptAt = "2026-05-31T00:01:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";
const mutationId = "44444444-4444-4444-8444-444444444444";
const operationId = "55555555-5555-4555-8555-555555555555";

function createTestDatabase() {
  return new BatimentControlDatabase(
    `batiment-control-sync-test-${Date.now()}-${Math.random()}`,
  );
}

function createIdFactory(ids: readonly string[]) {
  let index = 0;

  return () => {
    const id = ids[index];
    index += 1;

    if (!id) {
      throw new Error("No test id available.");
    }

    return id;
  };
}

const building: Building = {
  accessNotes: null,
  address: "12 rue du Controle",
  createdAt: now,
  createdBy: userId,
  deletedAt: null,
  id: buildingId,
  lastControlAt: null,
  name: "Batiment A",
  organizationId,
  priorityScore: 75,
  updatedAt: now,
};

describe("sync engine", () => {
  let database: BatimentControlDatabase;

  beforeEach(() => {
    database = createTestDatabase();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("marks ready operations as synced after a successful remote push", async () => {
    const outbox = createOutboxService(database, {
      createId: createIdFactory([operationId]),
      now: () => now,
    });
    await outbox.enqueue({
      aggregateId: buildingId,
      clientMutationId: mutationId,
      entity: "buildings",
      operationType: "upsert",
      organizationId,
      payload: building,
    });
    const pushedOperationIds: string[] = [];
    const remote: RemoteSyncAdapter = {
      async push(operation) {
        pushedOperationIds.push(operation.id);
      },
    };

    const result = await createSyncEngine({
      outbox,
      remote,
    }).syncPending();

    await expect(outbox.getById(operationId)).resolves.toMatchObject({
      status: "synced",
    });
    expect(pushedOperationIds).toEqual([operationId]);
    expect(result).toMatchObject({
      attempted: 1,
      failed: 0,
      offline: false,
      synced: 1,
      totalReady: 1,
    });
  });

  it("keeps failed operations in the outbox with a retry date", async () => {
    const outbox = createOutboxService(database, {
      createId: createIdFactory([operationId]),
      now: () => now,
    });
    await outbox.enqueue({
      aggregateId: buildingId,
      clientMutationId: mutationId,
      entity: "buildings",
      operationType: "upsert",
      organizationId,
      payload: building,
    });
    const remote: RemoteSyncAdapter = {
      async push() {
        throw new Error("Network unavailable");
      },
    };

    const result = await createSyncEngine({
      getNextAttemptAt: () => nextAttemptAt,
      outbox,
      remote,
    }).syncPending();

    await expect(outbox.getById(operationId)).resolves.toMatchObject({
      attemptCount: 1,
      lastError: "Network unavailable",
      nextAttemptAt,
      status: "error",
    });
    expect(result).toMatchObject({
      attempted: 1,
      failed: 1,
      synced: 0,
    });
    expect(result.errors).toEqual([
      {
        message: "Network unavailable",
        operationId,
      },
    ]);
  });

  it("does not process local operations while offline", async () => {
    const outbox = createOutboxService(database, {
      createId: createIdFactory([operationId]),
      now: () => now,
    });
    await outbox.enqueue({
      aggregateId: buildingId,
      clientMutationId: mutationId,
      entity: "buildings",
      operationType: "upsert",
      organizationId,
      payload: building,
    });

    const result = await createSyncEngine({
      isOnline: () => false,
      outbox,
      remote: {
        async push() {
          throw new Error("Should not be called.");
        },
      },
    }).syncPending();

    await expect(outbox.getById(operationId)).resolves.toMatchObject({
      status: "pending",
    });
    expect(result).toMatchObject({
      attempted: 0,
      offline: true,
      totalReady: 0,
    });
  });

  it("computes a bounded exponential retry delay", () => {
    expect(getDefaultNextAttemptAt(1, now)).toBe("2026-05-31T00:01:00.000Z");
    expect(getDefaultNextAttemptAt(3, now)).toBe("2026-05-31T00:04:00.000Z");
    expect(getDefaultNextAttemptAt(12, now)).toBe("2026-05-31T00:32:00.000Z");
  });
});
