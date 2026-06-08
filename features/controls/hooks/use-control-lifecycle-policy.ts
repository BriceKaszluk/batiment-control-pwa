"use client";

import { useCallback, useEffect, useRef } from "react";

type UseControlLifecyclePolicyOptions = {
  intervalMs?: number;
  userId: string | null;
};

export function useControlLifecyclePolicy({
  intervalMs = 60 * 60 * 1_000,
  userId,
}: UseControlLifecyclePolicyOptions) {
  const isApplyingRef = useRef(false);

  const applyPolicy = useCallback(async () => {
    if (!userId || isApplyingRef.current) {
      return;
    }

    isApplyingRef.current = true;

    try {
      const controlLifecycleModule = await import(
        "@/features/controls/services/control-lifecycle"
      );

      await controlLifecycleModule.applyControlLifecyclePolicy({ userId });
    } catch {
      // The lifecycle policy is opportunistic; field data remains local if it fails.
    } finally {
      isApplyingRef.current = false;
    }
  }, [userId]);

  useEffect(() => {
    void applyPolicy();

    if (intervalMs <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void applyPolicy();
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [applyPolicy, intervalMs]);
}
