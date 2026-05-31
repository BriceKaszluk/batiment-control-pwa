"use client";

import type { BatimentControlDatabase } from "@/lib/db/schema";
import { db } from "@/lib/db/dexie";
import type { Building } from "@/types/domain";

export type BuildingPriorityTone = "high" | "low" | "normal";

export type ListBuildingsForUserOptions = {
  database?: BatimentControlDatabase;
  limit?: number;
  userId: string | null;
};

export async function listBuildingsForUser({
  database = db,
  limit,
  userId,
}: ListBuildingsForUserOptions): Promise<Building[]> {
  if (!userId) {
    return [];
  }

  const organizationMembers = await database.organizationMembers
    .where("userId")
    .equals(userId)
    .toArray();
  const organizationIds = [
    ...new Set(organizationMembers.map((member) => member.organizationId)),
  ];

  if (organizationIds.length === 0) {
    return [];
  }

  const buildings = await database.buildings
    .where("organizationId")
    .anyOf(organizationIds)
    .filter((building) => building.deletedAt === null)
    .toArray();

  const sortedBuildings = buildings.sort(compareBuildingsByFieldPriority);

  return typeof limit === "number"
    ? sortedBuildings.slice(0, limit)
    : sortedBuildings;
}

export function compareBuildingsByFieldPriority(
  firstBuilding: Building,
  secondBuilding: Building,
) {
  const priorityDifference =
    secondBuilding.priorityScore - firstBuilding.priorityScore;

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  const firstControlRank = toLastControlRank(firstBuilding.lastControlAt);
  const secondControlRank = toLastControlRank(secondBuilding.lastControlAt);
  const lastControlDifference = firstControlRank - secondControlRank;

  if (lastControlDifference !== 0) {
    return lastControlDifference;
  }

  return firstBuilding.name.localeCompare(secondBuilding.name, "fr");
}

export function getBuildingPriorityTone(
  priorityScore: number,
): BuildingPriorityTone {
  if (priorityScore >= 70) {
    return "high";
  }

  if (priorityScore <= 30) {
    return "low";
  }

  return "normal";
}

export function getBuildingPriorityLabel(priorityScore: number) {
  const tone = getBuildingPriorityTone(priorityScore);

  if (tone === "high") {
    return "Priorite haute";
  }

  if (tone === "low") {
    return "Priorite basse";
  }

  return "Priorite normale";
}

function toLastControlRank(lastControlAt: string | null) {
  return lastControlAt ? Date.parse(lastControlAt) : Number.NEGATIVE_INFINITY;
}
