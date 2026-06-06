"use client";

import { db } from "@/lib/db/dexie";
import type { BatimentControlDatabase } from "@/lib/db/schema";
import { createOrganizationMemberRepository } from "@/lib/db/repositories/organization-member-repository";
import { createOrganizationRepository } from "@/lib/db/repositories/organization-repository";
import { createOrganizationScopedRepository } from "@/lib/db/repositories/organization-scoped-repository";
import {
  agentSchema,
  buildingSchema,
  checklistItemSchema,
  checklistResultSchema,
  controlSchema,
  correctiveActionSchema,
} from "@/lib/validation/schemas";

export function createRepositories(database: BatimentControlDatabase = db) {
  return {
    agents: createOrganizationScopedRepository(database.agents, agentSchema),
    buildings: createOrganizationScopedRepository(
      database.buildings,
      buildingSchema,
    ),
    checklistItems: createOrganizationScopedRepository(
      database.checklistItems,
      checklistItemSchema,
    ),
    checklistResults: createOrganizationScopedRepository(
      database.checklistResults,
      checklistResultSchema,
    ),
    controls: createOrganizationScopedRepository(database.controls, controlSchema),
    correctiveActions: createOrganizationScopedRepository(
      database.correctiveActions,
      correctiveActionSchema,
    ),
    organizationMembers: createOrganizationMemberRepository(
      database.organizationMembers,
    ),
    organizations: createOrganizationRepository(database.organizations),
  };
}

export const repositories = createRepositories();
