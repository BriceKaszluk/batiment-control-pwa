import type { OutboxStatusSummary } from "@/types/sync";

export type SyncStatusTone = "error" | "pending" | "processing" | "synced";

export type SyncStatusIndicator = {
  label: string;
  tone: SyncStatusTone;
  waitingCount: number;
};

export function getWaitingOutboxCount(summary: OutboxStatusSummary) {
  return summary.pending + summary.processing + summary.error;
}

export function getSyncStatusIndicator(
  summary: OutboxStatusSummary,
): SyncStatusIndicator {
  const waitingCount = getWaitingOutboxCount(summary);

  if (summary.error > 0) {
    return {
      label: `${summary.error} en erreur`,
      tone: "error",
      waitingCount,
    };
  }

  if (summary.processing > 0) {
    return {
      label: `${summary.processing} en cours`,
      tone: "processing",
      waitingCount,
    };
  }

  if (summary.pending > 0) {
    return {
      label: `${summary.pending} en attente`,
      tone: "pending",
      waitingCount,
    };
  }

  return {
    label: "A jour",
    tone: "synced",
    waitingCount,
  };
}
