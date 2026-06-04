import type { NetworkStatus } from "@/features/sync/hooks/use-network-status";

type AutoSyncReadinessInput = {
  enabled: boolean;
  isSyncing: boolean;
  networkStatus: NetworkStatus;
  userId: string | null;
};

type AutoSyncTriggerInput = AutoSyncReadinessInput & {
  requireWaitingOperations: boolean;
  waitingCount: number;
};

export function canStartAutoSync({
  enabled,
  isSyncing,
  networkStatus,
  userId,
}: AutoSyncReadinessInput) {
  return (
    enabled &&
    Boolean(userId) &&
    networkStatus === "online" &&
    !isSyncing
  );
}

export function shouldStartAutoSync({
  requireWaitingOperations,
  waitingCount,
  ...readiness
}: AutoSyncTriggerInput) {
  if (!canStartAutoSync(readiness)) {
    return false;
  }

  return !requireWaitingOperations || waitingCount > 0;
}
