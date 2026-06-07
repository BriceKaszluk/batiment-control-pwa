"use client";

import { RefreshCw, Wifi, WifiOff } from "lucide-react";

import { useNetworkStatus } from "@/features/sync/hooks/use-network-status";
import { useOutboxSync } from "@/features/sync/hooks/use-outbox-sync";
import { useOutboxStatusSummary } from "@/features/sync/hooks/use-outbox-status-summary";
import {
  getSyncStatusIndicator,
  type SyncStatusTone,
} from "@/features/sync/services/sync-status-format";
import { cn } from "@/lib/utils";

type SyncStatusBarProps = {
  syncEnabled: boolean;
  userId: string | null;
};

const syncToneClasses: Record<SyncStatusTone, string> = {
  error: "border-red-200 bg-red-50 text-red-700",
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  processing: "border-sky-200 bg-sky-50 text-sky-800",
  synced: "border-primary/20 bg-primary/10 text-primary",
};

export function SyncStatusBar({
  syncEnabled,
  userId,
}: Readonly<SyncStatusBarProps>) {
  const networkStatus = useNetworkStatus();
  const { error, isLoading, summary } = useOutboxStatusSummary();
  const syncStatus = getSyncStatusIndicator(summary);
  const outboxSync = useOutboxSync({
    enabled: syncEnabled,
    networkStatus,
    waitingCount: syncStatus.waitingCount,
    userId,
  });
  const isOffline = networkStatus === "offline";
  const canSync =
    syncEnabled && Boolean(userId) && !isOffline && !outboxSync.isSyncing;
  const NetworkIcon = isOffline ? WifiOff : Wifi;
  const syncError = error ?? outboxSync.error;

  return (
    <div
      aria-label="Etat terrain"
      className="flex flex-wrap items-center gap-2 text-xs font-medium"
    >
      <span
        className={cn(
          "status-pill h-8 gap-1 px-2",
          isOffline
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-primary/20 bg-primary/10 text-primary",
        )}
      >
        <NetworkIcon aria-hidden="true" className="size-4" />
        {isOffline ? "Hors ligne" : "En ligne"}
      </span>
      <span
        className={cn(
          "status-pill h-8 gap-1 px-2",
          syncError
            ? syncToneClasses.error
            : syncToneClasses[syncStatus.tone],
        )}
        title={syncError ?? syncStatus.label}
      >
        <RefreshCw
          aria-hidden="true"
          className={cn(
            "size-4",
            (isLoading ||
              outboxSync.isSyncing ||
              syncStatus.tone === "processing") &&
              "animate-spin",
          )}
        />
        {syncError ? "Sync indisponible" : syncStatus.label}
      </span>
      <button
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-foreground transition-[background-color,border-color,transform]",
          "duration-200 ease-out active:scale-[0.98] disabled:scale-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          canSync
            ? "hover:bg-secondary"
            : "cursor-not-allowed opacity-50",
        )}
        disabled={!canSync}
        onClick={() => {
          void outboxSync.syncNow();
        }}
        title={
          userId
            ? "Synchroniser maintenant"
            : "Connexion utilisateur en cours"
        }
        type="button"
      >
        <RefreshCw
          aria-hidden="true"
          className={cn("size-4", outboxSync.isSyncing && "animate-spin")}
        />
        Synchroniser
      </button>
      {syncError ? (
        <p className="basis-full text-xs font-medium text-red-700">
          {syncError}
        </p>
      ) : null}
    </div>
  );
}
