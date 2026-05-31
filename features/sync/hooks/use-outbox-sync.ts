"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { NetworkStatus } from "@/features/sync/hooks/use-network-status";
import { createClient } from "@/lib/supabase/client";
import { createSupabaseRemoteSyncAdapter } from "@/lib/sync/supabase-adapter";
import {
  createSyncEngine,
  type SyncEngineResult,
} from "@/lib/sync/sync-engine";

type UseOutboxSyncOptions = {
  enabled: boolean;
  networkStatus: NetworkStatus;
};

type OutboxSyncState = {
  error: string | null;
  isSyncing: boolean;
  lastResult: SyncEngineResult | null;
};

export function useOutboxSync({
  enabled,
  networkStatus,
}: UseOutboxSyncOptions) {
  const isSyncingRef = useRef(false);
  const [state, setState] = useState<OutboxSyncState>({
    error: null,
    isSyncing: false,
    lastResult: null,
  });

  const syncNow = useCallback(async () => {
    if (!enabled || networkStatus === "offline" || isSyncingRef.current) {
      return null;
    }

    isSyncingRef.current = true;
    setState((currentState) => ({
      ...currentState,
      error: null,
      isSyncing: true,
    }));

    try {
      const engine = createSyncEngine({
        isOnline: () => navigator.onLine,
        remote: createSupabaseRemoteSyncAdapter(createClient()),
      });
      const result = await engine.syncPending();

      setState({
        error: null,
        isSyncing: false,
        lastResult: result,
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Synchronisation indisponible";

      setState((currentState) => ({
        ...currentState,
        error: message,
        isSyncing: false,
      }));

      return null;
    } finally {
      isSyncingRef.current = false;
    }
  }, [enabled, networkStatus]);

  useEffect(() => {
    if (enabled && networkStatus === "online") {
      void syncNow();
    }
  }, [enabled, networkStatus, syncNow]);

  return {
    ...state,
    syncNow,
  };
}
