import type { z } from "zod";

import type {
  buildingCreateSchema,
  buildingSchema,
  checklistItemSchema,
  checklistResultSchema,
  controlCreateSchema,
  controlSchema,
  correctiveActionCreateSchema,
  correctiveActionSchema,
  organizationMemberSchema,
  organizationSchema,
} from "@/lib/validation/schemas";

export type Organization = z.infer<typeof organizationSchema>;
export type OrganizationMember = z.infer<typeof organizationMemberSchema>;
export type Building = z.infer<typeof buildingSchema>;
export type BuildingCreateInput = z.infer<typeof buildingCreateSchema>;
export type ChecklistItem = z.infer<typeof checklistItemSchema>;
export type Control = z.infer<typeof controlSchema>;
export type ControlCreateInput = z.infer<typeof controlCreateSchema>;
export type ChecklistResult = z.infer<typeof checklistResultSchema>;
export type CorrectiveAction = z.infer<typeof correctiveActionSchema>;
export type CorrectiveActionCreateInput = z.infer<
  typeof correctiveActionCreateSchema
>;
