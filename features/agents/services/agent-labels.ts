import type { Agent } from "@/types/domain";

type AgentStatus = Agent["status"];

export const agentStatusLabels: Record<AgentStatus, string> = {
  absent: "Absent",
  paid_leave: "Conges",
  present: "Present",
  replacement: "Remplacement",
  sick_leave: "Arret maladie",
  unknown: "Non renseigne",
};

export type AgentStatusTone = "available" | "away" | "neutral";

export function getAgentStatusLabel(status: AgentStatus) {
  return agentStatusLabels[status];
}

export function getAgentStatusTone(status: AgentStatus): AgentStatusTone {
  if (status === "present" || status === "replacement") {
    return "available";
  }

  if (status === "unknown") {
    return "neutral";
  }

  return "away";
}
