import { describe, expect, it } from "vitest";

import {
  getControlPdfFileName,
  sanitizeFileName,
} from "@/features/controls/services/control-pdf-export";
import type { LocalControlDetail } from "@/features/controls/services/local-control-detail";

const now = "2026-06-08T08:30:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";

const detail: LocalControlDetail = {
  agent: null,
  areaResults: [],
  building: {
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
    lastControlAt: now,
    name: "Le Roux Batiment A",
    organizationId,
    priorityLevel: "normal",
    sector: "Centre",
    serviceDays: [],
    updatedAt: now,
  },
  checklist: [],
  control: {
    archivedAt: null,
    buildingId,
    completedAt: now,
    controlledBy: userId,
    createdAt: now,
    deletedAt: null,
    detailsPurgedAt: null,
    generalComment: null,
    id: "44444444-4444-4444-8444-444444444444",
    organizationId,
    photosPurgedAt: null,
    qualityRating: "satisfying",
    startedAt: now,
    status: "completed",
    updatedAt: now,
  },
  photos: [],
};

describe("control PDF export", () => {
  it("sanitizes file names", () => {
    expect(sanitizeFileName("  Batiment / Hall Nord  ")).toBe(
      "batiment-hall-nord",
    );
  });

  it("builds a readable control PDF file name", () => {
    expect(getControlPdfFileName(detail)).toBe(
      "controle-le-roux-batiment-a-08-06-2026.pdf",
    );
  });
});
