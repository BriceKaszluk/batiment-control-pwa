import { describe, expect, it } from "vitest";

import {
  buildingSchema,
  controlSchema,
  correctiveActionSchema,
} from "@/lib/validation/schemas";

const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";
const controlId = "44444444-4444-4444-8444-444444444444";
const now = "2026-05-31T00:00:00.000Z";

describe("domain schemas", () => {
  it("accepts a valid building", () => {
    const result = buildingSchema.safeParse({
      accessNotes: null,
      address: "12 rue du Controle",
      createdAt: now,
      createdBy: userId,
      deletedAt: null,
      id: buildingId,
      lastControlAt: null,
      name: "Batiment A",
      organizationId,
      priorityScore: 80,
      updatedAt: now,
    });

    expect(result.success).toBe(true);
  });

  it("rejects an out-of-range building priority", () => {
    const result = buildingSchema.safeParse({
      accessNotes: null,
      address: null,
      createdAt: now,
      createdBy: userId,
      deletedAt: null,
      id: buildingId,
      lastControlAt: null,
      name: "Batiment A",
      organizationId,
      priorityScore: 101,
      updatedAt: now,
    });

    expect(result.success).toBe(false);
  });

  it("requires completed controls to have a completion date", () => {
    const result = controlSchema.safeParse({
      buildingId,
      completedAt: null,
      controlledBy: userId,
      createdAt: now,
      deletedAt: null,
      generalComment: null,
      id: controlId,
      organizationId,
      startedAt: now,
      status: "completed",
      updatedAt: now,
    });

    expect(result.success).toBe(false);
  });

  it("requires done corrective actions to have a resolution date", () => {
    const result = correctiveActionSchema.safeParse({
      assignedTo: null,
      buildingId,
      controlId: null,
      createdAt: now,
      createdBy: userId,
      deletedAt: null,
      description: null,
      dueDate: null,
      id: "55555555-5555-4555-8555-555555555555",
      organizationId,
      priority: "normal",
      resolvedAt: null,
      status: "done",
      title: "Reprise sol",
      updatedAt: now,
    });

    expect(result.success).toBe(false);
  });
});
