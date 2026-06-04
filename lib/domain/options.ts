export const memberRoles = ["owner", "admin", "team_lead", "cleaner"] as const;
export const workspaceTypes = ["personal", "team"] as const;
export const controlStatuses = ["draft", "completed", "canceled"] as const;
export const checklistResultStatuses = [
  "compliant",
  "non_compliant",
  "not_applicable",
] as const;
export const correctiveActionStatuses = [
  "open",
  "in_progress",
  "done",
  "canceled",
] as const;
export const photoUploadStatuses = [
  "pending",
  "processing",
  "synced",
  "error",
] as const;
export const agentStatuses = [
  "present",
  "absent",
  "sick_leave",
  "paid_leave",
  "replacement",
  "unknown",
] as const;
export const buildingPriorityLevels = [
  "low",
  "normal",
  "high",
  "critical",
] as const;
export const priorityLevels = ["low", "normal", "high"] as const;
export const weekDays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export const buildingAreas = [
  "outdoor",
  "hall",
  "elevator",
  "stairs",
  "floor_landings",
  "basement_access",
  "common_areas",
  "garage",
] as const;
export const serviceTasks = [
  "outdoor",
  "entrance_hall",
  "floor_landings",
  "stairs",
  "elevator",
  "bike_room",
  "basement",
  "trash_room",
  "windows",
  "dusting",
  "floor_cleaning",
  "touchpoint_disinfection",
] as const;
export const photoMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
