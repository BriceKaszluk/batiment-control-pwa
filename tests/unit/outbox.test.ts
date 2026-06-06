import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BatimentControlDatabase } from "@/lib/db/schema";
import { saveLocalMutation } from "@/lib/sync/local-mutation";
import {
  buildOutboxIdempotencyKey,
  createOutboxService,
} from "@/lib/sync/outbox";
import { buildingSchema } from "@/lib/validation/schemas";
import type { Building } from "@/types/domain";

const now = "2026-05-31T00:00:00.000Z";
const later = "2026-05-31T00:05:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";
const mutationId = "44444444-4444-4444-8444-444444444444";
const operationId = "55555555-5555-4555-8555-555555555555";

function createTestDatabase() {
  return new BatimentControlDatabase(
    `batiment-control-outbox-test-${Date.now()}-${Math.random()}`,
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
  address: "12 rue du Controle",
  agentStatus: "unknown",
  areasToCheck: [],
  assignedAgentId: null,
  assignedAgentName: null,
  createdAt: now,
  createdBy: userId,
  deletedAt: null,
  id: buildingId,
  internalNotes: null,
  lastControlAt: null,
  name: "Batiment A",
  organizationId,
  priorityLevel: "high",
  sector: "Secteur Nord",
  serviceDays: [],
  updatedAt: now,
};

describe("local outbox", () => {
  let database: BatimentControlDatabase;

  beforeEach(() => {
    database = createTestDatabase();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("creates idempotent pending operations", async () => {
    const service = createOutboxService(database, {
      createId: createIdFactory([operationId]),
      now: () => now,
    });

    const firstOperation = await service.enqueue({
      aggregateId: buildingId,
      clientMutationId: mutationId,
      entity: "buildings",
      operationType: "upsert",
      organizationId,
      payload: building,
    });
    const secondOperation = await service.enqueue({
      aggregateId: buildingId,
      clientMutationId: mutationId,
      entity: "buildings",
      operationType: "upsert",
      organizationId,
      payload: building,
    });

    expect(firstOperation).toEqual(secondOperation);
    await expect(database.outbox.count()).resolves.toBe(1);
    expect(firstOperation).toMatchObject({
      attemptCount: 0,
      id: operationId,
      idempotencyKey: buildOutboxIdempotencyKey({
        aggregateId: buildingId,
        clientMutationId: mutationId,
        entity: "buildings",
        operationType: "upsert",
      }),
      status: "pending",
    });
  });

  it("tracks processing, error and synced statuses", async () => {
    const service = createOutboxService(database, {
      createId: createIdFactory([operationId]),
      now: () => now,
    });
    const operation = await service.enqueue({
      aggregateId: buildingId,
      clientMutationId: mutationId,
      entity: "buildings",
      operationType: "upsert",
      organizationId,
      payload: building,
    });

    await expect(service.markProcessing(operation.id)).resolves.toMatchObject({
      status: "processing",
    });
    await expect(
      service.markError(operation.id, "Network unavailable", later),
    ).resolves.toMatchObject({
      attemptCount: 1,
      lastError: "Network unavailable",
      nextAttemptAt: later,
      status: "error",
    });
    await expect(service.markSynced(operation.id)).resolves.toMatchObject({
      lastError: null,
      nextAttemptAt: null,
      status: "synced",
    });
    await expect(service.countByStatus()).resolves.toEqual({
      error: 0,
      pending: 0,
      processing: 0,
      synced: 1,
    });
  });

  it("saves local records and outbox operations in the same transaction", async () => {
    const result = await saveLocalMutation({
      clientMutationId: mutationId,
      createId: createIdFactory([operationId]),
      database,
      entity: "buildings",
      now: () => now,
      record: building,
      schema: buildingSchema,
      table: database.buildings,
    });

    await expect(database.buildings.get(buildingId)).resolves.toEqual(building);
    await expect(database.outbox.get(operationId)).resolves.toEqual(
      result.outboxOperation,
    );
    expect(result.outboxOperation).toMatchObject({
      aggregateId: buildingId,
      entity: "buildings",
      organizationId,
      status: "pending",
    });
  });

  it("does not write a record or outbox operation when validation fails", async () => {
    const invalidBuilding: Building = {
      ...building,
      name: " ",
    };

    await expect(
      saveLocalMutation({
        clientMutationId: mutationId,
        createId: createIdFactory([operationId]),
        database,
        entity: "buildings",
        now: () => now,
        record: invalidBuilding,
        schema: buildingSchema,
        table: database.buildings,
      }),
    ).rejects.toThrow();
    await expect(database.buildings.count()).resolves.toBe(0);
    await expect(database.outbox.count()).resolves.toBe(0);
  });
});
