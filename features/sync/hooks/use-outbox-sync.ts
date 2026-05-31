"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { NetworkStatus } from "@/features/sync/hooks/use-network-status";
import { createClient } from "@/lib/supabase/client";
import { createSupabaseRemotePullAdapter } from "@/lib/sync/supabase-pull-adapter";
import { createSupabaseRemoteSyncAdapter } from "@/lib/sync/supabase-adapter";
import { saveRemoteSnapshot } from "@/lib/sync/remote-snapshot";
import {
  createSyncEngine,
  type SyncEngineResult,
} from "@/lib/sync/sync-engine";

type UseOutboxSyncOptions = {
  enabled: boolean;
  networkStatus: NetworkStatus;
  userId: string | null;
};

type OutboxSyncState = {
  error: string | null;
  isSyncing: boolean;
  lastResult: SyncEngineResult | null;
};

export function useOutboxSync({
  enabled,
  networkStatus,
  userId,
}: UseOutboxSyncOptions) {
  const isSyncingRef = useRef(false);
  const [state, setState] = useState<OutboxSyncState>({
    error: null,
    isSyncing: false,
    lastResult: null,
  });

  const syncNow = useCallback(async () => {
    if (
      !enabled ||
      !userId ||
      networkStatus === "offline" ||
      isSyncingRef.current
    ) {
      return null;
    }

    isSyncingRef.current = true;
    setState((currentState) => ({
      ...currentState,
      error: null,
      isSyncing: true,
    }));

    try {
      const client = createClient();
      const remoteSnapshot = await createSupabaseRemotePullAdapter(
        client,
      ).pullForUser(userId);
      await saveRemoteSnapshot(remoteSnapshot);

      const engine = createSyncEngine({
        isOnline: () => navigator.onLine,
        remote: createSupabaseRemoteSyncAdapter(client),
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
  }, [enabled, networkStatus, userId]);

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
