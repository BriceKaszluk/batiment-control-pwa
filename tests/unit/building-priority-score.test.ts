import { describe, expect, it } from "vitest";

import { calculateBuildingPriorityScore } from "@/features/buildings/services/building-priority-score";
import type {
  Building,
  ChecklistResult,
  Control,
  CorrectiveAction,
} from "@/types/domain";

const now = "2026-06-06T00:00:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";
const controlId = "44444444-4444-4444-8444-444444444444";

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
  priorityLevel: "normal",
  sector: "Secteur Nord",
  serviceDays: [],
  updatedAt: now,
};

function createControl(overrides: Partial<Control> = {}): Control {
  return {
    archivedAt: null,
    buildingId,
    completedAt: "2026-04-01T00:00:00.000Z",
    controlledBy: userId,
    createdAt: "2026-04-01T00:00:00.000Z",
    deletedAt: null,
    detailsPurgedAt: null,
    generalComment: null,
    id: controlId,
    organizationId,
    photosPurgedAt: null,
    qualityRating: "to_improve",
    startedAt: "2026-04-01T00:00:00.000Z",
    status: "completed",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function createCorrectiveAction(
  overrides: Partial<CorrectiveAction> = {},
): CorrectiveAction {
  return {
    assignedTo: null,
    buildingId,
    controlId,
    createdAt: now,
    createdBy: userId,
    deletedAt: null,
    description: null,
    dueDate: null,
    id: "55555555-5555-4555-8555-555555555555",
    organizationId,
    priority: "normal",
    resolvedAt: null,
    status: "open",
    title: "Reprise hall",
    updatedAt: now,
    ...overrides,
  };
}

describe("building priority score", () => {
  it("gives a high score to buildings that were never controlled", () => {
    const score = calculateBuildingPriorityScore({
      building: {
        ...building,
        priorityLevel: "high",
      },
      now,
    });

    expect(score.score).toBe(52);
    expect(score.level).toBe("watch");
    expect(score.factors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "controlDelay",
          points: 45,
        }),
      ]),
    );
  });

  it("combines delay, quality, corrective actions and configured priority", () => {
    const score = calculateBuildingPriorityScore({
      building: {
        ...building,
        priorityLevel: "critical",
      },
      latestCompletedControl: createControl({
        qualityRating: "unsatisfying",
      }),
      now,
      openCorrectiveActions: [
        createCorrectiveAction({
          dueDate: "2026-06-01",
          priority: "high",
        }),
        createCorrectiveAction({
          id: "66666666-6666-4666-8666-666666666666",
          priority: "normal",
        }),
      ],
    });

    expect(score.score).toBe(86);
    expect(score.level).toBe("urgent");
    expect(score.factors.map((factor) => factor.key)).toEqual([
      "controlDelay",
      "quality",
      "correctiveActions",
      "buildingPriority",
    ]);
  });

  it("falls back to checklist non-conformity when no global rating exists", () => {
    const checklistResults: ChecklistResult[] = [
      {
        checklistItemId: "77777777-7777-4777-8777-777777777777",
        comment: null,
        controlId,
        createdAt: now,
        id: "88888888-8888-4888-8888-888888888888",
        organizationId,
        status: "non_compliant",
        updatedAt: now,
      },
      {
        checklistItemId: "99999999-9999-4999-8999-999999999999",
        comment: null,
        controlId,
        createdAt: now,
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        organizationId,
        status: "compliant",
        updatedAt: now,
      },
    ];
    const score = calculateBuildingPriorityScore({
      building,
      latestChecklistResults: checklistResults,
      latestCompletedControl: createControl({
        completedAt: "2026-06-01T00:00:00.000Z",
        qualityRating: null,
      }),
      now,
    });

    expect(score.factors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "quality",
          points: 20,
        }),
      ]),
    );
  });
});
