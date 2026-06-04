"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { NetworkStatus } from "@/features/sync/hooks/use-network-status";
import { shouldStartAutoSync } from "@/features/sync/services/auto-sync";
import type { SyncEngineResult } from "@/lib/sync/sync-engine";

type UseOutboxSyncOptions = {
  autoRetryIntervalMs?: number;
  enabled: boolean;
  networkStatus: NetworkStatus;
  waitingCount: number;
  userId: string | null;
};

type OutboxSyncState = {
  error: string | null;
  isSyncing: boolean;
  lastResult: SyncEngineResult | null;
};

export function useOutboxSync({
  autoRetryIntervalMs = 30_000,
  enabled,
  networkStatus,
  waitingCount,
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
      const {
        createClient,
        createPhotoUploadSyncEngine,
        createSupabasePhotoUploadAdapter,
        createSupabaseRemotePullAdapter,
        createSupabaseRemoteSyncAdapter,
        createSyncEngine,
        mergeSyncResults,
        saveRemoteSnapshot,
      } = await loadSyncRuntime();
      const client = createClient();
      const remoteSnapshot =
        await createSupabaseRemotePullAdapter(client).pullForUser(userId);
      await saveRemoteSnapshot(remoteSnapshot);

      const engine = createSyncEngine({
        isOnline: () => navigator.onLine,
        remote: createSupabaseRemoteSyncAdapter(client),
      });
      const result = await engine.syncPending();
      const photoResult = await createPhotoUploadSyncEngine({
        isOnline: () => navigator.onLine,
        remote: createSupabasePhotoUploadAdapter({ client }),
      }).syncPending();
      const combinedResult = mergeSyncResults(result, photoResult);

      setState({
        error: null,
        isSyncing: false,
        lastResult: combinedResult,
      });

      return combinedResult;
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
    if (
      shouldStartAutoSync({
        enabled,
        isSyncing: isSyncingRef.current,
        networkStatus,
        requireWaitingOperations: false,
        userId,
        waitingCount: 0,
      })
    ) {
      void syncNow();
    }
  }, [enabled, networkStatus, syncNow, userId]);

  useEffect(() => {
    if (
      shouldStartAutoSync({
        enabled,
        isSyncing: isSyncingRef.current,
        networkStatus,
        requireWaitingOperations: true,
        userId,
        waitingCount,
      })
    ) {
      void syncNow();
    }
  }, [enabled, networkStatus, syncNow, userId, waitingCount]);

  useEffect(() => {
    if (autoRetryIntervalMs <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (
        shouldStartAutoSync({
          enabled,
          isSyncing: isSyncingRef.current,
          networkStatus,
          requireWaitingOperations: true,
          userId,
          waitingCount,
        })
      ) {
        void syncNow();
      }
    }, autoRetryIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    autoRetryIntervalMs,
    enabled,
    networkStatus,
    syncNow,
    userId,
    waitingCount,
  ]);

  return {
    ...state,
    syncNow,
  };
}

type SyncRuntime = Awaited<ReturnType<typeof loadSyncRuntimeInternal>>;

let syncRuntimePromise: Promise<SyncRuntime> | null = null;

function loadSyncRuntime(): Promise<SyncRuntime> {
  syncRuntimePromise ??= loadSyncRuntimeInternal();

  return syncRuntimePromise;
}

async function loadSyncRuntimeInternal() {
  const [
    supabaseClientModule,
    photoUploadEngineModule,
    remotePullAdapterModule,
    remoteSyncAdapterModule,
    photoUploadAdapterModule,
    remoteSnapshotModule,
    syncEngineModule,
  ] = await Promise.all([
    import("@/lib/supabase/client"),
    import("@/lib/sync/photo-upload-engine"),
    import("@/lib/sync/supabase-pull-adapter"),
    import("@/lib/sync/supabase-adapter"),
    import("@/lib/sync/supabase-photo-upload-adapter"),
    import("@/lib/sync/remote-snapshot"),
    import("@/lib/sync/sync-engine"),
  ]);

  return {
    createClient: supabaseClientModule.createClient,
    createPhotoUploadSyncEngine:
      photoUploadEngineModule.createPhotoUploadSyncEngine,
    createSupabasePhotoUploadAdapter:
      photoUploadAdapterModule.createSupabasePhotoUploadAdapter,
    createSupabaseRemotePullAdapter:
      remotePullAdapterModule.createSupabaseRemotePullAdapter,
    createSupabaseRemoteSyncAdapter:
      remoteSyncAdapterModule.createSupabaseRemoteSyncAdapter,
    createSyncEngine: syncEngineModule.createSyncEngine,
    mergeSyncResults: photoUploadEngineModule.mergeSyncResults,
    saveRemoteSnapshot: remoteSnapshotModule.saveRemoteSnapshot,
  };
}
