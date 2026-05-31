import { z } from "zod";

export const memberRoles = ["owner", "admin", "team_lead", "cleaner"] as const;
export const controlStatuses = ["draft", "completed", "canceled"] as const;
export const checklistResultStatuses = [
  "compliant",
  "non_compliant",
  "not_applicable",
] as const;
export const correctiveActionStatuses = [
  "open",
  "in_progress",
  "done",
  "canceled",
] as const;
export const photoUploadStatuses = [
  "pending",
  "processing",
  "uploaded",
  "error",
] as const;
export const priorityLevels = ["low", "normal", "high"] as const;
export const photoMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export const memberRoleSchema = z.enum(memberRoles);
export const controlStatusSchema = z.enum(controlStatuses);
export const checklistResultStatusSchema = z.enum(checklistResultStatuses);
export const correctiveActionStatusSchema = z.enum(correctiveActionStatuses);
export const photoUploadStatusSchema = z.enum(photoUploadStatuses);
export const priorityLevelSchema = z.enum(priorityLevels);
export const photoMimeTypeSchema = z.enum(photoMimeTypes);

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

export const organizationSchema = z
  .object({
    createdAt: isoDateTimeSchema,
    id: uuidSchema,
    name: z.string().trim().min(1).max(160),
    updatedAt: isoDateTimeSchema,
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
    accessNotes: nullableText(1000),
    address: nullableText(240),
    createdAt: isoDateTimeSchema,
    createdBy: uuidSchema,
    deletedAt: isoDateTimeSchema.nullable(),
    id: uuidSchema,
    lastControlAt: isoDateTimeSchema.nullable(),
    name: z.string().trim().min(1).max(160),
    organizationId: uuidSchema,
    priorityScore: z.number().int().min(0).max(100),
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

export const buildingCreateSchema = buildingSchema.pick({
  accessNotes: true,
  address: true,
  createdBy: true,
  id: true,
  name: true,
  organizationId: true,
  priorityScore: true,
});

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
