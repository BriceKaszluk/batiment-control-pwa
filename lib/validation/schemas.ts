import { z } from "zod";

import {
  agentStatuses,
  buildingAreas,
  buildingPriorityLevels,
  checklistResultStatuses,
  controlStatuses,
  correctiveActionStatuses,
  memberRoles,
  photoMimeTypes,
  photoUploadStatuses,
  priorityLevels,
  serviceTasks,
  weekDays,
  workspaceTypes,
} from "@/lib/domain/options";

export {
  agentStatuses,
  buildingAreas,
  buildingPriorityLevels,
  checklistResultStatuses,
  controlStatuses,
  correctiveActionStatuses,
  memberRoles,
  photoMimeTypes,
  photoUploadStatuses,
  priorityLevels,
  serviceTasks,
  weekDays,
  workspaceTypes,
} from "@/lib/domain/options";

export const memberRoleSchema = z.enum(memberRoles);
export const workspaceTypeSchema = z.enum(workspaceTypes);
export const controlStatusSchema = z.enum(controlStatuses);
export const checklistResultStatusSchema = z.enum(checklistResultStatuses);
export const correctiveActionStatusSchema = z.enum(correctiveActionStatuses);
export const photoUploadStatusSchema = z.enum(photoUploadStatuses);
export const agentStatusSchema = z.enum(agentStatuses);
export const buildingPriorityLevelSchema = z.enum(buildingPriorityLevels);
export const priorityLevelSchema = z.enum(priorityLevels);
export const weekDaySchema = z.enum(weekDays);
export const buildingAreaSchema = z.enum(buildingAreas);
export const serviceTaskSchema = z.enum(serviceTasks);
export const photoMimeTypeSchema = z.enum(photoMimeTypes);

const legacyBuildingAreaMap: Record<string, (typeof buildingAreas)[number]> = {
  basement: "basement_access",
  bike_room: "common_areas",
  entrance_hall: "hall",
  trash_room: "common_areas",
};

export function normalizeBuildingAreaList(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  const normalizedAreas = value.map((area) =>
    typeof area === "string" ? legacyBuildingAreaMap[area] ?? area : area,
  );

  return [...new Set(normalizedAreas)];
}

const buildingAreasToCheckSchema = z
  .preprocess(normalizeBuildingAreaList, z.array(buildingAreaSchema))
  .default([]);

const uuidSchema = z.string().uuid();
const isoDateTimeSchema = z.string().datetime({ offset: true });
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const blobSchema = z.custom<Blob>(
  (value) => typeof Blob !== "undefined" && value instanceof Blob,
  "A local photo blob is required",
);

function nullableText(maxLength: number) {
  return z.string().trim().max(maxLength).nullable();
}

export const buildingServiceDaySchema = z
  .object({
    day: weekDaySchema,
    id: uuidSchema,
    note: nullableText(1000).default(null),
    tasks: z.array(serviceTaskSchema).min(1),
  })
  .strict();

export const organizationSchema = z
  .object({
    createdAt: isoDateTimeSchema,
    id: uuidSchema,
    name: z.string().trim().min(1).max(160),
    ownerId: uuidSchema.nullable().default(null),
    updatedAt: isoDateTimeSchema,
    workspaceType: workspaceTypeSchema.default("team"),
  })
  .strict();

export const organizationMemberSchema = z
  .object({
    createdAt: isoDateTimeSchema,
    organizationId: uuidSchema,
    role: memberRoleSchema,
    userId: uuidSchema,
  })
  .strict();

export const buildingSchema = z
  .object({
    address: z.string().trim().min(1).max(240),
    agentStatus: agentStatusSchema.default("unknown"),
    areasToCheck: buildingAreasToCheckSchema,
    assignedAgentName: nullableText(160).default(null),
    createdAt: isoDateTimeSchema,
    createdBy: uuidSchema,
    deletedAt: isoDateTimeSchema.nullable(),
    id: uuidSchema,
    internalNotes: nullableText(3000).default(null),
    lastControlAt: isoDateTimeSchema.nullable(),
    name: z.string().trim().min(1).max(160),
    organizationId: uuidSchema,
    priorityLevel: buildingPriorityLevelSchema.default("normal"),
    sector: z.string().trim().min(1).max(160),
    serviceDays: z
      .array(
        buildingServiceDaySchema,
      )
      .default([])
      .refine((serviceDays) => {
        const uniqueDays = new Set(serviceDays.map((entry) => entry.day));
        return uniqueDays.size === serviceDays.length;
      }, "Chaque jour de prestation ne peut etre defini qu'une seule fois."),
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const checklistItemSchema = z
  .object({
    createdAt: isoDateTimeSchema,
    createdBy: uuidSchema,
    deletedAt: isoDateTimeSchema.nullable(),
    description: nullableText(1000),
    id: uuidSchema,
    isActive: z.boolean(),
    isRequired: z.boolean(),
    label: z.string().trim().min(1).max(180),
    organizationId: uuidSchema,
    position: z.number().int().min(0),
    updatedAt: isoDateTimeSchema,
  })
  .strict();

const controlObjectSchema = z
  .object({
    buildingId: uuidSchema,
    completedAt: isoDateTimeSchema.nullable(),
    controlledBy: uuidSchema,
    createdAt: isoDateTimeSchema,
    deletedAt: isoDateTimeSchema.nullable(),
    generalComment: nullableText(3000),
    id: uuidSchema,
    organizationId: uuidSchema,
    startedAt: isoDateTimeSchema,
    status: controlStatusSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const controlSchema = controlObjectSchema.refine(
  (value) => value.status !== "completed" || value.completedAt !== null,
  {
    message: "completedAt is required when status is completed",
    path: ["completedAt"],
  },
);

export const checklistResultSchema = z
  .object({
    checklistItemId: uuidSchema,
    comment: nullableText(2000),
    controlId: uuidSchema,
    createdAt: isoDateTimeSchema,
    id: uuidSchema,
    organizationId: uuidSchema,
    status: checklistResultStatusSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();

const correctiveActionObjectSchema = z
  .object({
    assignedTo: uuidSchema.nullable(),
    buildingId: uuidSchema,
    controlId: uuidSchema.nullable(),
    createdAt: isoDateTimeSchema,
    createdBy: uuidSchema,
    deletedAt: isoDateTimeSchema.nullable(),
    description: nullableText(2000),
    dueDate: dateSchema.nullable(),
    id: uuidSchema,
    organizationId: uuidSchema,
    priority: priorityLevelSchema,
    resolvedAt: isoDateTimeSchema.nullable(),
    status: correctiveActionStatusSchema,
    title: z.string().trim().min(1).max(180),
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const correctiveActionSchema = correctiveActionObjectSchema.refine(
  (value) => value.status !== "done" || value.resolvedAt !== null,
  {
    message: "resolvedAt is required when status is done",
    path: ["resolvedAt"],
  },
);

export const controlPhotoSchema = z
  .object({
    blob: blobSchema,
    buildingId: uuidSchema,
    caption: nullableText(500),
    controlId: uuidSchema,
    createdAt: isoDateTimeSchema,
    createdBy: uuidSchema,
    deletedAt: isoDateTimeSchema.nullable(),
    fileName: z.string().trim().min(1).max(180),
    id: uuidSchema,
    mimeType: photoMimeTypeSchema,
    organizationId: uuidSchema,
    remotePath: z.string().trim().min(1).max(500).nullable(),
    sizeBytes: z.number().int().min(1),
    updatedAt: isoDateTimeSchema,
    uploadedAt: isoDateTimeSchema.nullable(),
    uploadStatus: photoUploadStatusSchema,
  })
  .strict();

export const photoUploadSchema = z
  .object({
    attemptCount: z.number().int().min(0),
    controlId: uuidSchema,
    createdAt: isoDateTimeSchema,
    id: uuidSchema,
    idempotencyKey: z.string().min(1).max(360),
    lastError: z.string().max(2000).nullable(),
    nextAttemptAt: isoDateTimeSchema.nullable(),
    organizationId: uuidSchema,
    photoId: uuidSchema,
    status: photoUploadStatusSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const buildingCreateSchema = z
  .object({
    address: buildingSchema.shape.address,
    agentStatus: agentStatusSchema.default("unknown"),
    areasToCheck: buildingAreasToCheckSchema,
    assignedAgentName: nullableText(160).optional().default(null),
    internalNotes: nullableText(3000).optional().default(null),
    name: buildingSchema.shape.name,
    priorityLevel: buildingPriorityLevelSchema.default("normal"),
    sector: buildingSchema.shape.sector,
    serviceDays: z
      .array(buildingServiceDaySchema)
      .default([])
      .refine((serviceDays) => {
        const uniqueDays = new Set(serviceDays.map((entry) => entry.day));
        return uniqueDays.size === serviceDays.length;
      }, "Chaque jour de prestation ne peut etre defini qu'une seule fois."),
  })
  .strict();

export const controlCreateSchema = controlObjectSchema.pick({
  buildingId: true,
  controlledBy: true,
  generalComment: true,
  id: true,
  organizationId: true,
  startedAt: true,
  status: true,
});

export const correctiveActionCreateSchema = correctiveActionObjectSchema.pick({
  assignedTo: true,
  buildingId: true,
  controlId: true,
  createdBy: true,
  description: true,
  dueDate: true,
  id: true,
  organizationId: true,
  priority: true,
  status: true,
  title: true,
});
