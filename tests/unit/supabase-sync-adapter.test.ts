import { describe, expect, it } from "vitest";

import { toSupabaseMutation } from "@/lib/sync/supabase-adapter";
import type { Building, ChecklistResult } from "@/types/domain";
import type { OutboxOperation } from "@/types/sync";

const now = "2026-05-31T00:00:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";
const operationId = "44444444-4444-4444-8444-444444444444";
const mutationId = "55555555-5555-4555-8555-555555555555";

function createOperation(
  overrides: Pick<OutboxOperation, "aggregateId" | "entity" | "payload">,
): OutboxOperation {
  return {
    aggregateId: overrides.aggregateId,
    attemptCount: 0,
    clientMutationId: mutationId,
    createdAt: now,
    entity: overrides.entity,
    id: operationId,
    idempotencyKey: `${overrides.entity}:${overrides.aggregateId}:upsert:${mutationId}`,
    lastError: null,
    nextAttemptAt: null,
    operationType: "upsert",
    organizationId,
    payload: overrides.payload,
    status: "pending",
    updatedAt: now,
  };
}

describe("Supabase sync adapter", () => {
  it("maps building payloads to Supabase insert rows", () => {
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

    expect(
      toSupabaseMutation(
        createOperation({
          aggregateId: building.id,
          entity: "buildings",
          payload: building,
        }),
      ),
    ).toEqual({
      row: {
        access_notes: null,
        address: "12 rue du Controle",
        created_at: now,
        created_by: userId,
        deleted_at: null,
        id: buildingId,
        last_control_at: null,
        name: "Batiment A",
        organization_id: organizationId,
        priority_score: 75,
        updated_at: now,
      },
      table: "buildings",
    });
  });

  it("maps checklist result payloads to the remote table name", () => {
    const checklistResult: ChecklistResult = {
      checklistItemId: "66666666-6666-4666-8666-666666666666",
      comment: null,
      controlId: "77777777-7777-4777-8777-777777777777",
      createdAt: now,
      id: "88888888-8888-4888-8888-888888888888",
      organizationId,
      status: "compliant",
      updatedAt: now,
    };

    expect(
      toSupabaseMutation(
        createOperation({
          aggregateId: checklistResult.id,
          entity: "checklistResults",
          payload: checklistResult,
        }),
      ),
    ).toMatchObject({
      row: {
        checklist_item_id: checklistResult.checklistItemId,
        control_id: checklistResult.controlId,
        organization_id: organizationId,
        status: "compliant",
      },
      table: "control_checklist_results",
    });
  });
});
