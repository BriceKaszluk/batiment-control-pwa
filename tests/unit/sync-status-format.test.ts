import { describe, expect, it } from "vitest";

import {
  getSyncStatusIndicator,
  getWaitingOutboxCount,
} from "@/features/sync/services/sync-status-format";
import type { OutboxStatusSummary } from "@/types/sync";

function createSummary(
  overrides: Partial<OutboxStatusSummary> = {},
): OutboxStatusSummary {
  return {
    error: 0,
    pending: 0,
    processing: 0,
    synced: 0,
    ...overrides,
  };
}

describe("sync status formatting", () => {
  it("counts local operations that still need attention", () => {
    expect(
      getWaitingOutboxCount(
        createSummary({ error: 1, pending: 2, processing: 3, synced: 4 }),
      ),
    ).toBe(6);
  });

  it("shows synced when no outbox operation is waiting", () => {
    expect(getSyncStatusIndicator(createSummary())).toEqual({
      label: "A jour",
      tone: "synced",
      waitingCount: 0,
    });
  });

  it("prioritizes errors over pending and processing states", () => {
    expect(
      getSyncStatusIndicator(
        createSummary({ error: 1, pending: 2, processing: 3 }),
      ),
    ).toEqual({
      label: "1 en erreur",
      tone: "error",
      waitingCount: 6,
    });
  });
});
