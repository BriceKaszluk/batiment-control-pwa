import { describe, expect, it } from "vitest";

import {
  toAgent,
  toBuilding,
  toChecklistResult,
  toOrganization,
  toOrganizationMember,
} from "@/lib/sync/supabase-pull-adapter";
import type { Database } from "@/types/supabase";

type PublicTables = Database["public"]["Tables"];

const now = "2026-05-31T00:00:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const buildingId = "33333333-3333-4333-8333-333333333333";

describe("Supabase pull adapter", () => {
  it("maps remote agents to local domain records", () => {
    const row: PublicTables["agents"]["Row"] = {
      created_at: now,
      created_by: userId,
      deleted_at: null,
      id: "66666666-6666-4666-8666-666666666666",
      name: "Agent A",
      organization_id: organizationId,
      status: "present",
      updated_at: now,
    };

    expect(toAgent(row)).toEqual({
      createdAt: now,
      createdBy: userId,
      deletedAt: null,
      id: row.id,
      name: "Agent A",
      organizationId,
      status: "present",
      updatedAt: now,
    });
  });

  it("maps personal workspace organizations", () => {
    const row: PublicTables["organizations"]["Row"] = {
      created_at: now,
      id: organizationId,
      name: "Mon espace",
      owner_id: userId,
      updated_at: now,
      workspace_type: "personal",
    };

    expect(toOrganization(row)).toEqual({
      createdAt: now,
      id: organizationId,
      name: "Mon espace",
      ownerId: userId,
      updatedAt: now,
      workspaceType: "personal",
    });
  });

  it("maps organization memberships to local camelCase fields", () => {
    const row: PublicTables["organization_members"]["Row"] = {
      created_at: now,
      organization_id: organizationId,
      role: "team_lead",
      user_id: userId,
    };

    expect(toOrganizationMember(row)).toEqual({
      createdAt: now,
      organizationId,
      role: "team_lead",
      userId,
    });
  });

  it("maps remote buildings to local domain records", () => {
    const row: PublicTables["buildings"]["Row"] = {
      agent_status: "unknown",
      areas_to_check: ["entrance_hall", "trash_room", "basement"],
      assigned_agent_id: null,
      assigned_agent_name: null,
      access_notes: null,
      address: "12 rue du Controle",
      created_at: now,
      created_by: userId,
      deleted_at: null,
      id: buildingId,
      internal_notes: null,
      last_control_at: null,
      name: "Batiment A",
      organization_id: organizationId,
      priority_level: "high",
      priority_score: 80,
      sector: "Secteur Nord",
      service_days: [],
      updated_at: now,
    };

    expect(toBuilding(row)).toMatchObject({
      address: "12 rue du Controle",
      agentStatus: "unknown",
      areasToCheck: ["hall", "common_areas", "basement_access"],
      assignedAgentId: null,
      assignedAgentName: null,
      createdAt: now,
      createdBy: userId,
      id: buildingId,
      internalNotes: null,
      organizationId,
      priorityLevel: "high",
      sector: "Secteur Nord",
      serviceDays: [],
      updatedAt: now,
    });
  });

  it("maps checklist results from the remote table", () => {
    const row: PublicTables["control_checklist_results"]["Row"] = {
      checklist_item_id: "44444444-4444-4444-8444-444444444444",
      comment: null,
      control_id: "55555555-5555-4555-8555-555555555555",
      created_at: now,
      id: "66666666-6666-4666-8666-666666666666",
      organization_id: organizationId,
      status: "non_compliant",
      updated_at: now,
    };

    expect(toChecklistResult(row)).toMatchObject({
      checklistItemId: row.checklist_item_id,
      controlId: row.control_id,
      organizationId,
      status: "non_compliant",
    });
  });
});
