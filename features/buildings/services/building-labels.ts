import type { Building } from "@/types/domain";

export type BuildingPriorityTone = "critical" | "high" | "low" | "normal";

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
