"use client";

import { createOutboxService, type OutboxService } from "@/lib/sync/outbox";
import type { OutboxStatusSummary } from "@/types/sync";

export async function getOutboxStatusSummary(
  service: OutboxService = createOutboxService(),
): Promise<OutboxStatusSummary> {
  return service.countByStatus();
}
