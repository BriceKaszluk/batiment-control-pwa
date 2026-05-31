"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { RemoteSyncAdapter } from "@/lib/sync/sync-engine";
import {
  buildingSchema,
  checklistItemSchema,
  checklistResultSchema,
  controlSchema,
  correctiveActionSchema,
} from "@/lib/validation/schemas";
import type {
  Building,
  ChecklistItem,
  ChecklistResult,
  Control,
  CorrectiveAction,
} from "@/types/domain";
import type { OutboxOperation } from "@/types/sync";
import type { Database } from "@/types/supabase";

type PublicTables = Database["public"]["Tables"];

type SupabaseMutation =
  | { row: PublicTables["buildings"]["Insert"]; table: "buildings" }
  | { row: PublicTables["checklist_items"]["Insert"]; table: "checklist_items" }
  | { row: PublicTables["control_checklist_results"]["Insert"]; table: "control_checklist_results" }
  | { row: PublicTables["controls"]["Insert"]; table: "controls" }
  | { row: PublicTables["corrective_actions"]["Insert"]; table: "corrective_actions" };

type BrowserSupabaseClient = SupabaseClient<Database>;

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
    case "buildings":
      return {
        row: toBuildingInsert(buildingSchema.parse(operation.payload)),
        table: "buildings",
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
    case "controls":
      return {
        row: toControlInsert(controlSchema.parse(operation.payload)),
        table: "controls",
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
    case "buildings": {
      const { error } = await client
        .from("buildings")
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
    case "controls": {
      const { error } = await client
        .from("controls")
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

function toBuildingInsert(building: Building): PublicTables["buildings"]["Insert"] {
  return {
    agent_status: building.agentStatus,
    areas_to_check: building.areasToCheck,
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
    completed_at: control.completedAt,
    controlled_by: control.controlledBy,
    created_at: control.createdAt,
    deleted_at: control.deletedAt,
    general_comment: control.generalComment,
    id: control.id,
    organization_id: control.organizationId,
    started_at: control.startedAt,
    status: control.status,
    updated_at: control.updatedAt,
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
