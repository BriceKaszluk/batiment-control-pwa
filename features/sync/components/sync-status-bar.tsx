"use client";

import { RefreshCw, Wifi, WifiOff } from "lucide-react";

import { useNetworkStatus } from "@/features/sync/hooks/use-network-status";
import { useOutboxStatusSummary } from "@/features/sync/hooks/use-outbox-status-summary";
import {
  getSyncStatusIndicator,
  type SyncStatusTone,
} from "@/features/sync/services/sync-status-format";
import { cn } from "@/lib/utils";

const syncToneClasses: Record<SyncStatusTone, string> = {
  error: "border-red-200 bg-red-50 text-red-700",
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  processing: "border-sky-200 bg-sky-50 text-sky-800",
  synced: "border-primary/20 bg-primary/10 text-primary",
};

export function SyncStatusBar() {
  const networkStatus = useNetworkStatus();
  const { error, isLoading, summary } = useOutboxStatusSummary();
  const syncStatus = getSyncStatusIndicator(summary);
  const isOffline = networkStatus === "offline";
  const NetworkIcon = isOffline ? WifiOff : Wifi;

  return (
    <div
      aria-label="Etat terrain"
      className="flex flex-wrap items-center gap-2 text-xs font-medium"
    >
      <span
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-md border px-2",
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
          "inline-flex h-8 items-center gap-1 rounded-md border px-2",
          error
            ? syncToneClasses.error
            : syncToneClasses[syncStatus.tone],
        )}
      >
        <RefreshCw
          aria-hidden="true"
          className={cn(
            "size-4",
            (isLoading || syncStatus.tone === "processing") && "animate-spin",
          )}
        />
        {error ? "Sync indisponible" : syncStatus.label}
      </span>
    </div>
  );
}
