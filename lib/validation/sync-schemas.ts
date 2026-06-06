import { z } from "zod";

import {
  outboxOperationTypes,
  outboxStatuses,
  synchronizableEntities,
} from "@/types/sync";
import type { Json } from "@/types/supabase";

export const jsonValueSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const outboxOperationSchema = z
  .object({
    aggregateId: z.string().uuid(),
    attemptCount: z.number().int().min(0),
    clientMutationId: z.string().uuid(),
    createdAt: z.string().datetime({ offset: true }),
    entity: z.enum(synchronizableEntities),
    id: z.string().uuid(),
    idempotencyKey: z.string().min(1).max(360),
    lastError: z.string().max(2000).nullable(),
    nextAttemptAt: z.string().datetime({ offset: true }).nullable(),
    operationType: z.enum(outboxOperationTypes),
    organizationId: z.string().uuid(),
    payload: jsonValueSchema,
    status: z.enum(outboxStatuses),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const createOutboxOperationInputSchema = outboxOperationSchema.pick({
  aggregateId: true,
  clientMutationId: true,
  entity: true,
  operationType: true,
  organizationId: true,
  payload: true,
});

export const controlPhotoDeletePayloadSchema = z
  .object({
    deletedAt: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
    organizationId: z.string().uuid(),
    remotePath: z.string().trim().min(1).max(500),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export function parseOutboxPayload(value: unknown): Json {
  return jsonValueSchema.parse(value);
}
