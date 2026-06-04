"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { createClient } from "@/lib/supabase/client";
import { createEmptyRemoteSnapshot, type RemoteSnapshot } from "@/lib/sync/remote-snapshot";
import {
  buildingAreaSchema,
  buildingPriorityLevelSchema,
  buildingServiceDaySchema,
} from "@/lib/validation/schemas";
import type {
  Building,
  ChecklistItem,
  ChecklistResult,
  Control,
  CorrectiveAction,
  Organization,
  OrganizationMember,
} from "@/types/domain";
import type { Database } from "@/types/supabase";

type PublicTables = Database["public"]["Tables"];
type BrowserSupabaseClient = SupabaseClient<Database>;

export type RemotePullAdapter = {
  pullForUser(userId: string): Promise<RemoteSnapshot>;
};

export function createSupabaseRemotePullAdapter(
  client: BrowserSupabaseClient = createClient(),
): RemotePullAdapter {
  return {
    async pullForUser(userId) {
      const personalWorkspace = await ensurePersonalWorkspace(client);
      const { data: membershipRows, error: membershipError } = await client
        .from("organization_members")
        .select("*")
        .eq("user_id", userId)
        .eq("organization_id", personalWorkspace.organization_id);
      throwIfSupabaseError(membershipError);

      const organizationMembers = (membershipRows ?? []).map(
        toOrganizationMember,
      );
      const organizationIds = organizationMembers.map(
        (member) => member.organizationId,
      );

      if (organizationIds.length === 0) {
        return {
          ...createEmptyRemoteSnapshot(),
          organizationMembers,
        };
      }

      const [
        organizationRows,
        buildingRows,
        checklistItemRows,
        controlRows,
        checklistResultRows,
        correctiveActionRows,
      ] = await Promise.all([
        fetchOrganizations(client, organizationIds),
        fetchBuildings(client, organizationIds),
        fetchChecklistItems(client, organizationIds),
        fetchControls(client, organizationIds),
        fetchChecklistResults(client, organizationIds),
        fetchCorrectiveActions(client, organizationIds),
      ]);

      return {
        buildings: buildingRows.map(toBuilding),
        checklistItems: checklistItemRows.map(toChecklistItem),
        checklistResults: checklistResultRows.map(toChecklistResult),
        controls: controlRows.map(toControl),
        correctiveActions: correctiveActionRows.map(toCorrectiveAction),
        organizationMembers,
        organizations: organizationRows.map(toOrganization),
      };
    },
  };
}

export function toOrganization(
  row: PublicTables["organizations"]["Row"],
): Organization {
  return {
    createdAt: row.created_at,
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    updatedAt: row.updated_at,
    workspaceType: row.workspace_type,
  };
}

export function toOrganizationMember(
  row: PublicTables["organization_members"]["Row"],
): OrganizationMember {
  return {
    createdAt: row.created_at,
    organizationId: row.organization_id,
    role: row.role,
    userId: row.user_id,
  };
}

export function toBuilding(row: PublicTables["buildings"]["Row"]): Building {
  return {
    address: (row.address ?? "Adresse non renseignee").trim(),
    agentStatus: row.agent_status,
    areasToCheck: z.array(buildingAreaSchema).parse(row.areas_to_check),
    assignedAgentName: row.assigned_agent_name,
    createdAt: row.created_at,
    createdBy: row.created_by,
    deletedAt: row.deleted_at,
    id: row.id,
    internalNotes: row.internal_notes ?? row.access_notes,
    lastControlAt: row.last_control_at,
    name: row.name,
    organizationId: row.organization_id,
    priorityLevel: buildingPriorityLevelSchema.parse(row.priority_level),
    sector: row.sector,
    serviceDays: z.array(buildingServiceDaySchema).parse(row.service_days),
    updatedAt: row.updated_at,
  };
}

export function toChecklistItem(
  row: PublicTables["checklist_items"]["Row"],
): ChecklistItem {
  return {
    createdAt: row.created_at,
    createdBy: row.created_by,
    deletedAt: row.deleted_at,
    description: row.description,
    id: row.id,
    isActive: row.is_active,
    isRequired: row.is_required,
    label: row.label,
    organizationId: row.organization_id,
    position: row.position,
    updatedAt: row.updated_at,
  };
}

export function toControl(row: PublicTables["controls"]["Row"]): Control {
  return {
    buildingId: row.building_id,
    completedAt: row.completed_at,
    controlledBy: row.controlled_by,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    generalComment: row.general_comment,
    id: row.id,
    organizationId: row.organization_id,
    startedAt: row.started_at,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

export function toChecklistResult(
  row: PublicTables["control_checklist_results"]["Row"],
): ChecklistResult {
  return {
    checklistItemId: row.checklist_item_id,
    comment: row.comment,
    controlId: row.control_id,
    createdAt: row.created_at,
    id: row.id,
    organizationId: row.organization_id,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

export function toCorrectiveAction(
  row: PublicTables["corrective_actions"]["Row"],
): CorrectiveAction {
  return {
    assignedTo: row.assigned_to,
    buildingId: row.building_id,
    controlId: row.control_id,
    createdAt: row.created_at,
    createdBy: row.created_by,
    deletedAt: row.deleted_at,
    description: row.description,
    dueDate: row.due_date,
    id: row.id,
    organizationId: row.organization_id,
    priority: row.priority,
    resolvedAt: row.resolved_at,
    status: row.status,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

async function fetchOrganizations(
  client: BrowserSupabaseClient,
  organizationIds: string[],
) {
  const { data, error } = await client
    .from("organizations")
    .select("*")
    .in("id", organizationIds);
  throwIfSupabaseError(error);

  return data ?? [];
}

async function fetchBuildings(
  client: BrowserSupabaseClient,
  organizationIds: string[],
) {
  const { data, error } = await client
    .from("buildings")
    .select("*")
    .in("organization_id", organizationIds);
  throwIfSupabaseError(error);

  return data ?? [];
}

async function fetchChecklistItems(
  client: BrowserSupabaseClient,
  organizationIds: string[],
) {
  const { data, error } = await client
    .from("checklist_items")
    .select("*")
    .in("organization_id", organizationIds);
  throwIfSupabaseError(error);

  return data ?? [];
}

async function fetchControls(
  client: BrowserSupabaseClient,
  organizationIds: string[],
) {
  const { data, error } = await client
    .from("controls")
    .select("*")
    .in("organization_id", organizationIds);
  throwIfSupabaseError(error);

  return data ?? [];
}

async function fetchChecklistResults(
  client: BrowserSupabaseClient,
  organizationIds: string[],
) {
  const { data, error } = await client
    .from("control_checklist_results")
    .select("*")
    .in("organization_id", organizationIds);
  throwIfSupabaseError(error);

  return data ?? [];
}

async function fetchCorrectiveActions(
  client: BrowserSupabaseClient,
  organizationIds: string[],
) {
  const { data, error } = await client
    .from("corrective_actions")
    .select("*")
    .in("organization_id", organizationIds);
  throwIfSupabaseError(error);

  return data ?? [];
}

function throwIfSupabaseError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

async function ensurePersonalWorkspace(client: BrowserSupabaseClient) {
  const { data, error } = await client.rpc("ensure_personal_workspace", {
    workspace_name: "Mon espace",
  });
  throwIfSupabaseError(error);

  const workspace = data?.[0];

  if (!workspace) {
    throw new Error("Espace personnel indisponible.");
  }

  return workspace;
}
