"use client";

import type { BatimentControlDatabase } from "@/lib/db/schema";
import { db } from "@/lib/db/dexie";
import type { Building, Organization } from "@/types/domain";

export type BuildingPriorityTone = "critical" | "high" | "low" | "normal";

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

  const organizations = await database.organizations.bulkGet(organizationIds);
  const personalOrganizationIds = organizations
    .filter(
      (organization): organization is Organization =>
        organization !== undefined &&
        organization.ownerId === userId &&
        organization.workspaceType === "personal",
    )
    .map((organization) => organization.id);
  const visibleOrganizationIds =
    personalOrganizationIds.length > 0 ? personalOrganizationIds : organizationIds;

  const buildings = await database.buildings
    .where("organizationId")
    .anyOf(visibleOrganizationIds)
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
    toPriorityRank(secondBuilding.priorityLevel) -
    toPriorityRank(firstBuilding.priorityLevel);

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
  priorityLevel: Building["priorityLevel"],
): BuildingPriorityTone {
  return priorityLevel;
}

export function getBuildingPriorityLabel(priorityLevel: Building["priorityLevel"]) {
  const tone = getBuildingPriorityTone(priorityLevel);

  if (tone === "critical") {
    return "Priorite critique";
  }

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

function toPriorityRank(priorityLevel: Building["priorityLevel"]) {
  if (priorityLevel === "critical") {
    return 3;
  }

  if (priorityLevel === "high") {
    return 2;
  }

  if (priorityLevel === "normal") {
    return 1;
  }

  return 0;
}
