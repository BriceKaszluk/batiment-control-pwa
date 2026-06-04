import { describe, expect, it } from "vitest";

import {
  canStartAutoSync,
  shouldStartAutoSync,
} from "@/features/sync/services/auto-sync";

describe("auto sync decisions", () => {
  it("starts only when sync is configured, online, authenticated and idle", () => {
    expect(
      canStartAutoSync({
        enabled: true,
        isSyncing: false,
        networkStatus: "online",
        userId: "22222222-2222-4222-8222-222222222222",
      }),
    ).toBe(true);
    expect(
      canStartAutoSync({
        enabled: true,
        isSyncing: false,
        networkStatus: "offline",
        userId: "22222222-2222-4222-8222-222222222222",
      }),
    ).toBe(false);
    expect(
      canStartAutoSync({
        enabled: true,
        isSyncing: true,
        networkStatus: "online",
        userId: "22222222-2222-4222-8222-222222222222",
      }),
    ).toBe(false);
  });

  it("allows startup pulls even when no local operation is waiting", () => {
    expect(
      shouldStartAutoSync({
        enabled: true,
        isSyncing: false,
        networkStatus: "online",
        requireWaitingOperations: false,
        userId: "22222222-2222-4222-8222-222222222222",
        waitingCount: 0,
      }),
    ).toBe(true);
  });

  it("requires waiting operations for outbox-triggered sync", () => {
    const input = {
      enabled: true,
      isSyncing: false,
      networkStatus: "online" as const,
      requireWaitingOperations: true,
      userId: "22222222-2222-4222-8222-222222222222",
    };

    expect(shouldStartAutoSync({ ...input, waitingCount: 0 })).toBe(false);
    expect(shouldStartAutoSync({ ...input, waitingCount: 1 })).toBe(true);
  });
});
