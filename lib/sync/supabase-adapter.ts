"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { RemoteSyncAdapter } from "@/lib/sync/sync-engine";
import { controlPhotoStorageBucket } from "@/lib/sync/supabase-photo-upload-adapter";
import { controlPhotoDeletePayloadSchema } from "@/lib/validation/sync-schemas";
import {
  agentSchema,
  buildingSchema,
  buildingSectorSchema,
  checklistItemSchema,
  checklistResultSchema,
  controlSchema,
  controlSummarySchema,
  correctiveActionSchema,
} from "@/lib/validation/schemas";
import type {
  Agent,
  Building,
  BuildingSector,
  ChecklistItem,
  ChecklistResult,
  Control,
  ControlSummary,
  CorrectiveAction,
} from "@/types/domain";
import type { OutboxOperation } from "@/types/sync";
import type { Database } from "@/types/supabase";

type PublicTables = Database["public"]["Tables"];

type SupabaseMutation =
  | { row: PublicTables["agents"]["Insert"]; table: "agents" }
  | { row: PublicTables["buildings"]["Insert"]; table: "buildings" }
  | { row: PublicTables["building_sectors"]["Insert"]; table: "building_sectors" }
  | { row: PublicTables["checklist_items"]["Insert"]; table: "checklist_items" }
  | { row: PublicTables["control_checklist_results"]["Insert"]; table: "control_checklist_results" }
  | { row: ControlPhotoDeletePayload; table: "control_photos" }
  | { row: PublicTables["controls"]["Insert"]; table: "controls" }
  | { row: PublicTables["control_summaries"]["Insert"]; table: "control_summaries" }
  | { row: PublicTables["corrective_actions"]["Insert"]; table: "corrective_actions" };

type BrowserSupabaseClient = SupabaseClient<Database>;
type ControlPhotoDeletePayload = ReturnType<
  typeof controlPhotoDeletePayloadSchema.parse
>;

export function createSupabaseRemoteSyncAdapter(
  client: BrowserSupabaseClient = createClient(),
): RemoteSyncAdapter {
  return {
    async push(operation) {
      await pushOutboxOperation(client, operation);
    },
  };
}

export function toSupabaseMutation(operation: OutboxOperation): SupabaseMutation {
  switch (operation.entity) {
    case "agents":
      return {
        row: toAgentInsert(agentSchema.parse(operation.payload)),
        table: "agents",
      };
    case "buildings":
      return {
        row: toBuildingInsert(buildingSchema.parse(operation.payload)),
        table: "buildings",
      };
    case "buildingSectors":
      return {
        row: toBuildingSectorInsert(
          buildingSectorSchema.parse(operation.payload),
        ),
        table: "building_sectors",
      };
    case "checklistItems":
      return {
        row: toChecklistItemInsert(checklistItemSchema.parse(operation.payload)),
        table: "checklist_items",
      };
    case "checklistResults":
      return {
        row: toChecklistResultInsert(
          checklistResultSchema.parse(operation.payload),
        ),
        table: "control_checklist_results",
      };
    case "controlPhotos":
      return {
        row: controlPhotoDeletePayloadSchema.parse(operation.payload),
        table: "control_photos",
      };
    case "controls":
      return {
        row: toControlInsert(controlSchema.parse(operation.payload)),
        table: "controls",
      };
    case "controlSummaries":
      return {
        row: toControlSummaryInsert(
          controlSummarySchema.parse(operation.payload),
        ),
        table: "control_summaries",
      };
    case "correctiveActions":
      return {
        row: toCorrectiveActionInsert(
          correctiveActionSchema.parse(operation.payload),
        ),
        table: "corrective_actions",
      };
  }
}

async function pushOutboxOperation(
  client: BrowserSupabaseClient,
  operation: OutboxOperation,
) {
  const mutation = toSupabaseMutation(operation);

  switch (mutation.table) {
    case "agents": {
      const { error } = await client
        .from("agents")
        .upsert(mutation.row, { onConflict: "id" });
      throwIfSupabaseError(error);
      return;
    }
    case "buildings": {
      const { error } = await client
        .from("buildings")
        .upsert(mutation.row, { onConflict: "id" });
      throwIfSupabaseError(error);
      return;
    }
    case "building_sectors": {
      const { error } = await client
        .from("building_sectors")
        .upsert(mutation.row, { onConflict: "id" });
      throwIfSupabaseError(error);
      return;
    }
    case "checklist_items": {
      const { error } = await client
        .from("checklist_items")
        .upsert(mutation.row, { onConflict: "id" });
      throwIfSupabaseError(error);
      return;
    }
    case "control_checklist_results": {
      const { error } = await client
        .from("control_checklist_results")
        .upsert(mutation.row, { onConflict: "id" });
      throwIfSupabaseError(error);
      return;
    }
    case "control_photos": {
      if (operation.operationType !== "delete") {
        throw new Error("Operation photo non supportee.");
      }

      const { error: storageError } = await client.storage
        .from(controlPhotoStorageBucket)
        .remove([mutation.row.remotePath]);
      throwIfSupabaseError(storageError);

      const { error: rowError } = await client
        .from("control_photos")
        .update({
          deleted_at: mutation.row.deletedAt,
          updated_at: mutation.row.updatedAt,
        })
        .eq("id", mutation.row.id)
        .eq("organization_id", mutation.row.organizationId);
      throwIfSupabaseError(rowError);
      return;
    }
    case "controls": {
      const { error } = await client
        .from("controls")
        .upsert(mutation.row, { onConflict: "id" });
      throwIfSupabaseError(error);
      return;
    }
    case "control_summaries": {
      const { error } = await client
        .from("control_summaries")
        .upsert(mutation.row, { onConflict: "id" });
      throwIfSupabaseError(error);
      return;
    }
    case "corrective_actions": {
      const { error } = await client
        .from("corrective_actions")
        .upsert(mutation.row, { onConflict: "id" });
      throwIfSupabaseError(error);
      return;
    }
  }
}

function toAgentInsert(agent: Agent): PublicTables["agents"]["Insert"] {
  return {
    created_at: agent.createdAt,
    created_by: agent.createdBy,
    deleted_at: agent.deletedAt,
    id: agent.id,
    name: agent.name,
    organization_id: agent.organizationId,
    status: agent.status,
    updated_at: agent.updatedAt,
  };
}

function toBuildingInsert(building: Building): PublicTables["buildings"]["Insert"] {
  return {
    agent_status: building.agentStatus,
    areas_to_check: building.areasToCheck,
    assigned_agent_id: building.assignedAgentId,
    assigned_agent_name: building.assignedAgentName,
    address: building.address,
    created_at: building.createdAt,
    created_by: building.createdBy,
    deleted_at: building.deletedAt,
    id: building.id,
    internal_notes: building.internalNotes,
    last_control_at: building.lastControlAt,
    name: building.name,
    organization_id: building.organizationId,
    priority_level: building.priorityLevel,
    priority_score: toLegacyPriorityScore(building.priorityLevel),
    sector: building.sector,
    service_days: building.serviceDays,
    updated_at: building.updatedAt,
  };
}

function toBuildingSectorInsert(
  sector: BuildingSector,
): PublicTables["building_sectors"]["Insert"] {
  return {
    created_at: sector.createdAt,
    created_by: sector.createdBy,
    deleted_at: sector.deletedAt,
    id: sector.id,
    name: sector.name,
    organization_id: sector.organizationId,
    updated_at: sector.updatedAt,
  };
}

function toLegacyPriorityScore(priorityLevel: Building["priorityLevel"]): number {
  if (priorityLevel === "critical") {
    return 90;
  }

  if (priorityLevel === "high") {
    return 75;
  }

  if (priorityLevel === "low") {
    return 25;
  }

  return 50;
}

function toChecklistItemInsert(
  checklistItem: ChecklistItem,
): PublicTables["checklist_items"]["Insert"] {
  return {
    created_at: checklistItem.createdAt,
    created_by: checklistItem.createdBy,
    deleted_at: checklistItem.deletedAt,
    description: checklistItem.description,
    id: checklistItem.id,
    is_active: checklistItem.isActive,
    is_required: checklistItem.isRequired,
    label: checklistItem.label,
    organization_id: checklistItem.organizationId,
    position: checklistItem.position,
    updated_at: checklistItem.updatedAt,
  };
}

function toControlInsert(control: Control): PublicTables["controls"]["Insert"] {
  return {
    building_id: control.buildingId,
    archived_at: control.archivedAt,
    completed_at: control.completedAt,
    controlled_by: control.controlledBy,
    created_at: control.createdAt,
    deleted_at: control.deletedAt,
    details_purged_at: control.detailsPurgedAt,
    general_comment: control.generalComment,
    id: control.id,
    organization_id: control.organizationId,
    photos_purged_at: control.photosPurgedAt,
    quality_rating: control.qualityRating,
    started_at: control.startedAt,
    status: control.status,
    updated_at: control.updatedAt,
  };
}

function toControlSummaryInsert(
  summary: ControlSummary,
): PublicTables["control_summaries"]["Insert"] {
  return {
    building_address: summary.buildingAddress,
    building_id: summary.buildingId,
    building_name: summary.buildingName,
    checklist_result_count: summary.checklistResultCount,
    completed_at: summary.completedAt,
    control_id: summary.controlId,
    controlled_by: summary.controlledBy,
    corrective_action_count: summary.correctiveActionCount,
    created_at: summary.createdAt,
    deleted_at: summary.deletedAt,
    general_comment: summary.generalComment,
    id: summary.id,
    non_compliant_result_count: summary.nonCompliantResultCount,
    organization_id: summary.organizationId,
    photo_count: summary.photoCount,
    quality_rating: summary.qualityRating,
    sector: summary.sector,
    started_at: summary.startedAt,
    status: summary.status,
    updated_at: summary.updatedAt,
  };
}

function toChecklistResultInsert(
  checklistResult: ChecklistResult,
): PublicTables["control_checklist_results"]["Insert"] {
  return {
    checklist_item_id: checklistResult.checklistItemId,
    comment: checklistResult.comment,
    control_id: checklistResult.controlId,
    created_at: checklistResult.createdAt,
    id: checklistResult.id,
    organization_id: checklistResult.organizationId,
    status: checklistResult.status,
    updated_at: checklistResult.updatedAt,
  };
}

function toCorrectiveActionInsert(
  correctiveAction: CorrectiveAction,
): PublicTables["corrective_actions"]["Insert"] {
  return {
    assigned_to: correctiveAction.assignedTo,
    building_id: correctiveAction.buildingId,
    control_id: correctiveAction.controlId,
    created_at: correctiveAction.createdAt,
    created_by: correctiveAction.createdBy,
    deleted_at: correctiveAction.deletedAt,
    description: correctiveAction.description,
    due_date: correctiveAction.dueDate,
    id: correctiveAction.id,
    organization_id: correctiveAction.organizationId,
    priority: correctiveAction.priority,
    resolved_at: correctiveAction.resolvedAt,
    status: correctiveAction.status,
    title: correctiveAction.title,
    updated_at: correctiveAction.updatedAt,
  };
}

function throwIfSupabaseError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}
