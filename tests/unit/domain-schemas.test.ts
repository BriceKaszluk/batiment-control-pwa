import { describe, expect, it } from "vitest";

import {
  agentSchema,
  buildingSchema,
  buildingSectorSchema,
  controlPhotoSchema,
  controlSchema,
  correctiveActionSchema,
  organizationSchema,
} from "@/lib/validation/schemas";

const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";
const agentId = "77777777-7777-4777-8777-777777777777";
const controlId = "44444444-4444-4444-8444-444444444444";
const now = "2026-05-31T00:00:00.000Z";

describe("domain schemas", () => {
  it("accepts a valid agent", () => {
    const result = agentSchema.safeParse({
      createdAt: now,
      createdBy: userId,
      deletedAt: null,
      id: agentId,
      name: "Agent A",
      organizationId,
      status: "present",
      updatedAt: now,
    });

    expect(result.success).toBe(true);
  });

  it("accepts a valid building sector", () => {
    const result = buildingSectorSchema.safeParse({
      createdAt: now,
      createdBy: userId,
      deletedAt: null,
      id: "88888888-8888-4888-8888-888888888888",
      name: "Secteur Nord",
      organizationId,
      updatedAt: now,
    });

    expect(result.success).toBe(true);
  });

  it("accepts a personal user workspace", () => {
    const result = organizationSchema.safeParse({
      createdAt: now,
      id: organizationId,
      name: "Mon espace",
      ownerId: userId,
      updatedAt: now,
      workspaceType: "personal",
    });

    expect(result.success).toBe(true);
  });

  it("accepts a valid building", () => {
    const result = buildingSchema.safeParse({
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
    });

    expect(result.success).toBe(true);
  });

  it("rejects buildings with an empty name", () => {
    const result = buildingSchema.safeParse({
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
      name: "   ",
      organizationId,
      priorityLevel: "normal",
      sector: "Secteur Nord",
      serviceDays: [],
      updatedAt: now,
    });

    expect(result.success).toBe(false);
  });

  it("rejects buildings with an empty address", () => {
    const result = buildingSchema.safeParse({
      address: " ",
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
      priorityLevel: "normal",
      sector: "Secteur Nord",
      serviceDays: [],
      updatedAt: now,
    });

    expect(result.success).toBe(false);
  });

  it("rejects buildings with an empty sector", () => {
    const result = buildingSchema.safeParse({
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
      priorityLevel: "normal",
      sector: " ",
      serviceDays: [],
      updatedAt: now,
    });

    expect(result.success).toBe(false);
  });

  it("accepts buildings with multiple service days", () => {
    const result = buildingSchema.safeParse({
      address: "12 rue du Controle",
      agentStatus: "present",
      areasToCheck: [],
      assignedAgentId: null,
      assignedAgentName: "Agent A",
      createdAt: now,
      createdBy: userId,
      deletedAt: null,
      id: buildingId,
      internalNotes: null,
      lastControlAt: null,
      name: "Batiment A",
      organizationId,
      priorityLevel: "critical",
      sector: "Secteur Nord",
      serviceDays: [
        {
          day: "monday",
          id: "77777777-7777-4777-8777-777777777777",
          note: null,
          tasks: ["outdoor", "entrance_hall"],
        },
        {
          day: "friday",
          id: "88888888-8888-4888-8888-888888888888",
          note: "Local poubelle uniquement le vendredi",
          tasks: ["trash_room"],
        },
      ],
      updatedAt: now,
    });

    expect(result.success).toBe(true);
  });

  it("accepts buildings with areas to check", () => {
    const result = buildingSchema.safeParse({
      address: "12 rue du Controle",
      agentStatus: "unknown",
      areasToCheck: ["outdoor", "hall", "common_areas", "garage"],
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
    });

    expect(result.success).toBe(true);
  });

  it("normalizes legacy building areas", () => {
    const result = buildingSchema.safeParse({
      address: "12 rue du Controle",
      agentStatus: "unknown",
      areasToCheck: ["entrance_hall", "trash_room", "bike_room", "basement"],
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
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("Expected legacy areas to be normalized.");
    }
    expect(result.data.areasToCheck).toEqual([
      "hall",
      "common_areas",
      "basement_access",
    ]);
  });

  it("rejects unsupported building areas", () => {
    const result = buildingSchema.safeParse({
      address: "12 rue du Controle",
      agentStatus: "unknown",
      areasToCheck: ["local_inconnu"],
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
      qualityRating: "acceptable",
      startedAt: now,
      status: "completed",
      updatedAt: now,
    });

    expect(result.success).toBe(false);
  });

  it("defaults a draft control without a quality rating", () => {
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
      status: "draft",
      updatedAt: now,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("Expected the control to be valid.");
    }
    expect(result.data.qualityRating).toBeNull();
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

  it("accepts a valid local control photo", () => {
    const result = controlPhotoSchema.safeParse({
      blob: new Blob(["photo"], { type: "image/jpeg" }),
      buildingId,
      caption: null,
      controlId,
      createdAt: now,
      createdBy: userId,
      deletedAt: null,
      fileName: "hall.jpg",
      id: "66666666-6666-4666-8666-666666666666",
      mimeType: "image/jpeg",
      organizationId,
      remotePath: null,
      sizeBytes: 5,
      updatedAt: now,
      uploadedAt: null,
      uploadStatus: "pending",
    });

    expect(result.success).toBe(true);
  });
});
