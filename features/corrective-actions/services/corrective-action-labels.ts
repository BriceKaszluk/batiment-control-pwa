import type { CorrectiveAction } from "@/types/domain";

export function getCorrectiveActionPriorityLabel(
  priority: CorrectiveAction["priority"],
) {
  if (priority === "high") {
    return "Haute";
  }

  if (priority === "low") {
    return "Basse";
  }

  return "Normale";
}

export function getCorrectiveActionStatusLabel(
  status: CorrectiveAction["status"],
) {
  if (status === "in_progress") {
    return "En cours";
  }

  if (status === "done") {
    return "Terminee";
  }

  if (status === "canceled") {
    return "Annulee";
  }

  return "Ouverte";
}
