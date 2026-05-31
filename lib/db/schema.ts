"use client";

import Dexie, { type Table } from "dexie";

import type {
  Building,
  ChecklistItem,
  ChecklistResult,
  Control,
  CorrectiveAction,
  Organization,
  OrganizationMember,
} from "@/types/domain";
import type { OutboxOperation } from "@/types/sync";

export const localDatabaseName = "batiment-control-local";

const versionOneStores = {
  buildings:
    "&id, organizationId, deletedAt, updatedAt, [organizationId+deletedAt], [organizationId+priorityScore]",
  checklistItems:
    "&id, organizationId, deletedAt, isActive, position, updatedAt, [organizationId+deletedAt], [organizationId+isActive+position]",
  checklistResults:
    "&id, organizationId, controlId, checklistItemId, updatedAt, [organizationId+controlId], [controlId+checklistItemId]",
  controls:
    "&id, organizationId, buildingId, controlledBy, status, startedAt, deletedAt, updatedAt, [organizationId+buildingId], [organizationId+status], [organizationId+deletedAt]",
  correctiveActions:
    "&id, organizationId, buildingId, controlId, assignedTo, status, priority, dueDate, deletedAt, updatedAt, [organizationId+status], [organizationId+assignedTo], [organizationId+deletedAt]",
  organizationMembers: "[organizationId+userId], organizationId, userId, role, createdAt",
  organizations: "&id, name, updatedAt",
};

const versionTwoStores = {
  ...versionOneStores,
  outbox:
    "&id, &idempotencyKey, organizationId, entity, aggregateId, operationType, status, createdAt, updatedAt, nextAttemptAt, [status+createdAt], [organizationId+status], [entity+aggregateId]",
};

export class BatimentControlDatabase extends Dexie {
  buildings!: Table<Building, string>;
  checklistItems!: Table<ChecklistItem, string>;
  checklistResults!: Table<ChecklistResult, string>;
  controls!: Table<Control, string>;
  correctiveActions!: Table<CorrectiveAction, string>;
  organizationMembers!: Table<OrganizationMember, [string, string]>;
  organizations!: Table<Organization, string>;
  outbox!: Table<OutboxOperation, string>;

  constructor(databaseName = localDatabaseName) {
    super(databaseName);

    this.version(1).stores(versionOneStores);
    this.version(2).stores(versionTwoStores);
  }
}
