import type { z } from "zod";

import type {
  agentCreateSchema,
  agentSchema,
  buildingCreateSchema,
  buildingSectorCreateSchema,
  buildingSectorSchema,
  buildingSchema,
  checklistItemSchema,
  checklistResultSchema,
  controlPhotoSchema,
  controlCreateSchema,
  controlSchema,
  controlSummarySchema,
  correctiveActionCreateSchema,
  correctiveActionSchema,
  organizationMemberSchema,
  organizationSchema,
  photoUploadSchema,
} from "@/lib/validation/schemas";

export type Agent = z.infer<typeof agentSchema>;
export type AgentCreateInput = z.infer<typeof agentCreateSchema>;
export type BuildingSector = z.infer<typeof buildingSectorSchema>;
export type BuildingSectorCreateInput = z.infer<
  typeof buildingSectorCreateSchema
>;
export type Organization = z.infer<typeof organizationSchema>;
export type OrganizationMember = z.infer<typeof organizationMemberSchema>;
export type Building = z.infer<typeof buildingSchema>;
export type BuildingCreateInput = z.infer<typeof buildingCreateSchema>;
export type ChecklistItem = z.infer<typeof checklistItemSchema>;
export type Control = z.infer<typeof controlSchema>;
export type ControlCreateInput = z.infer<typeof controlCreateSchema>;
export type ControlSummary = z.infer<typeof controlSummarySchema>;
export type ChecklistResult = z.infer<typeof checklistResultSchema>;
export type ControlPhoto = z.infer<typeof controlPhotoSchema>;
export type CorrectiveAction = z.infer<typeof correctiveActionSchema>;
export type CorrectiveActionCreateInput = z.infer<
  typeof correctiveActionCreateSchema
>;
export type PhotoUpload = z.infer<typeof photoUploadSchema>;
