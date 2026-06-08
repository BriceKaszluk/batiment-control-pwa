"use client";

import type {
  Building,
  ChecklistResult,
  Control,
} from "@/types/domain";

export type BuildingPriorityScoreLevel =
  | "normal"
  | "watch"
  | "priority"
  | "urgent";

export type BuildingPriorityScoreFactorKey =
  | "controlDelay"
  | "quality"
  | "buildingPriority";

export type BuildingPriorityScoreFactor = {
  description: string;
  key: BuildingPriorityScoreFactorKey;
  label: string;
  maxPoints: number;
  points: number;
};

export type BuildingPriorityScore = {
  factors: BuildingPriorityScoreFactor[];
  label: string;
  level: BuildingPriorityScoreLevel;
  score: number;
};

export type CalculateBuildingPriorityScoreInput = {
  building: Building;
  latestCompletedControl?: Control | null;
  latestChecklistResults?: ChecklistResult[];
  now?: string;
};

const maxControlDelayPoints = 55;
const maxQualityPoints = 30;
const maxBuildingPriorityPoints = 15;

export function calculateBuildingPriorityScore({
  building,
  latestChecklistResults = [],
  latestCompletedControl = null,
  now = new Date().toISOString(),
}: CalculateBuildingPriorityScoreInput): BuildingPriorityScore {
  const factors = [
    getControlDelayFactor({ building, latestCompletedControl, now }),
    getQualityFactor({ latestChecklistResults, latestCompletedControl }),
    getBuildingPriorityFactor(building.priorityLevel),
  ];
  const score = clampScore(
    factors.reduce((total, factor) => total + factor.points, 0),
  );
  const level = getBuildingPriorityScoreLevel(score);

  return {
    factors,
    label: getBuildingPriorityScoreLabel(level),
    level,
    score,
  };
}

export function getBuildingPriorityScoreLevel(
  score: number,
): BuildingPriorityScoreLevel {
  if (score >= 80) {
    return "urgent";
  }

  if (score >= 60) {
    return "priority";
  }

  if (score >= 30) {
    return "watch";
  }

  return "normal";
}

export function getBuildingPriorityScoreLabel(
  level: BuildingPriorityScoreLevel,
) {
  if (level === "urgent") {
    return "Urgent";
  }

  if (level === "priority") {
    return "Prioritaire";
  }

  if (level === "watch") {
    return "A surveiller";
  }

  return "Normal";
}

function getControlDelayFactor({
  building,
  latestCompletedControl,
  now,
}: {
  building: Building;
  latestCompletedControl: Control | null;
  now: string;
}): BuildingPriorityScoreFactor {
  const lastControlAt = latestCompletedControl?.completedAt ?? building.lastControlAt;

  if (!lastControlAt) {
    return {
      description: "Aucun controle termine",
      key: "controlDelay",
      label: "Retard controle",
      maxPoints: maxControlDelayPoints,
      points: maxControlDelayPoints,
    };
  }

  const daysSinceControl = getElapsedDays(lastControlAt, now);
  const points =
    daysSinceControl >= 90
      ? 55
      : daysSinceControl >= 60
        ? 42
        : daysSinceControl >= 30
          ? 25
          : daysSinceControl >= 14
            ? 12
            : 0;

  return {
    description: `Dernier controle il y a ${daysSinceControl} jour${daysSinceControl > 1 ? "s" : ""}`,
    key: "controlDelay",
    label: "Retard controle",
    maxPoints: maxControlDelayPoints,
    points,
  };
}

function getQualityFactor({
  latestChecklistResults,
  latestCompletedControl,
}: {
  latestChecklistResults: ChecklistResult[];
  latestCompletedControl: Control | null;
}): BuildingPriorityScoreFactor {
  if (!latestCompletedControl) {
    return {
      description: "Aucun controle precedent",
      key: "quality",
      label: "Qualite",
      maxPoints: maxQualityPoints,
      points: 0,
    };
  }

  if (latestCompletedControl.qualityRating) {
    return {
      description: getQualityRatingDescription(latestCompletedControl.qualityRating),
      key: "quality",
      label: "Qualite",
      maxPoints: maxQualityPoints,
      points: getQualityRatingPoints(latestCompletedControl.qualityRating),
    };
  }

  const checkedResults = latestChecklistResults.filter(
    (result) => result.status !== "not_applicable",
  );
  const nonCompliantCount = checkedResults.filter(
    (result) => result.status === "non_compliant",
  ).length;
  const nonCompliantRatio =
    checkedResults.length > 0 ? nonCompliantCount / checkedResults.length : 0;
  const points =
    nonCompliantRatio >= 0.5
      ? 25
      : nonCompliantRatio >= 0.2
        ? 15
        : nonCompliantCount > 0
          ? 7
          : 0;

  return {
    description:
      checkedResults.length > 0
        ? `${nonCompliantCount}/${checkedResults.length} point non conforme`
        : "Aucun etat global renseigne",
    key: "quality",
    label: "Qualite",
    maxPoints: maxQualityPoints,
    points,
  };
}

function getBuildingPriorityFactor(
  priorityLevel: Building["priorityLevel"],
): BuildingPriorityScoreFactor {
  const points = {
    critical: 15,
    high: 10,
    low: 0,
    normal: 4,
  } satisfies Record<Building["priorityLevel"], number>;

  return {
    description: getBuildingPriorityDescription(priorityLevel),
    key: "buildingPriority",
    label: "Priorite batiment",
    maxPoints: maxBuildingPriorityPoints,
    points: points[priorityLevel],
  };
}

function getQualityRatingPoints(
  qualityRating: NonNullable<Control["qualityRating"]>,
) {
  if (qualityRating === "unsatisfying") {
    return 30;
  }

  if (qualityRating === "to_improve") {
    return 20;
  }

  if (qualityRating === "acceptable") {
    return 10;
  }

  return 0;
}

function getQualityRatingDescription(
  qualityRating: NonNullable<Control["qualityRating"]>,
) {
  if (qualityRating === "unsatisfying") {
    return "Dernier controle insatisfaisant";
  }

  if (qualityRating === "to_improve") {
    return "Dernier controle a ameliorer";
  }

  if (qualityRating === "acceptable") {
    return "Dernier controle acceptable";
  }

  return "Dernier controle satisfaisant";
}

function getBuildingPriorityDescription(
  priorityLevel: Building["priorityLevel"],
) {
  if (priorityLevel === "critical") {
    return "Priorite configuree critique";
  }

  if (priorityLevel === "high") {
    return "Priorite configuree haute";
  }

  if (priorityLevel === "normal") {
    return "Priorite configuree normale";
  }

  return "Priorite configuree basse";
}

function getElapsedDays(from: string, to: string) {
  const elapsedMs = Date.parse(to) - Date.parse(from);
  const elapsedDays = Math.floor(elapsedMs / 86_400_000);

  return Math.max(0, elapsedDays);
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}
