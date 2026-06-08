import type { Json } from "@/types/supabase";

export const synchronizableEntities = [
  "agents",
  "buildings",
  "buildingSectors",
  "checklistItems",
  "controlAreaResults",
  "checklistResults",
  "controlPhotos",
  "controls",
  "controlSummaries",
  "correctiveActions",
] as const;

export const outboxOperationTypes = ["upsert", "delete"] as const;
export const outboxStatuses = ["pending", "processing", "synced", "error"] as const;

export type SynchronizableEntity = (typeof synchronizableEntities)[number];
export type OutboxOperationType = (typeof outboxOperationTypes)[number];
export type OutboxStatus = (typeof outboxStatuses)[number];

export type OutboxOperation = {
  aggregateId: string;
  attemptCount: number;
  clientMutationId: string;
  createdAt: string;
  entity: SynchronizableEntity;
  id: string;
  idempotencyKey: string;
  lastError: string | null;
  nextAttemptAt: string | null;
  operationType: OutboxOperationType;
  organizationId: string;
  payload: Json;
  status: OutboxStatus;
  updatedAt: string;
};

export type CreateOutboxOperationInput = {
  aggregateId: string;
  clientMutationId?: string;
  entity: SynchronizableEntity;
  operationType: OutboxOperationType;
  organizationId: string;
  payload: Json;
};

export type OutboxStatusSummary = Record<OutboxStatus, number>;

export type LocalMutationResult<TEntity> = {
  outboxOperation: OutboxOperation;
  record: TEntity;
};
