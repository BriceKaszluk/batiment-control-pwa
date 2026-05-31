"use client";

import Dexie, { type Table } from "dexie";

import type {
  Building,
  ChecklistItem,
  ChecklistResult,
  Control,
  ControlPhoto,
  CorrectiveAction,
  Organization,
  OrganizationMember,
  PhotoUpload,
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

const versionThreeStores = {
  ...versionTwoStores,
  controlPhotos:
    "&id, organizationId, controlId, buildingId, createdBy, uploadStatus, deletedAt, updatedAt, [organizationId+controlId], [organizationId+uploadStatus], [organizationId+deletedAt]",
  photoUploads:
    "&id, &idempotencyKey, organizationId, photoId, controlId, status, createdAt, updatedAt, nextAttemptAt, [status+createdAt], [organizationId+status], [photoId+status]",
};

export class BatimentControlDatabase extends Dexie {
  buildings!: Table<Building, string>;
  checklistItems!: Table<ChecklistItem, string>;
  checklistResults!: Table<ChecklistResult, string>;
  controls!: Table<Control, string>;
  controlPhotos!: Table<ControlPhoto, string>;
  correctiveActions!: Table<CorrectiveAction, string>;
  organizationMembers!: Table<OrganizationMember, [string, string]>;
  organizations!: Table<Organization, string>;
  outbox!: Table<OutboxOperation, string>;
  photoUploads!: Table<PhotoUpload, string>;

  constructor(databaseName = localDatabaseName) {
    super(databaseName);

    this.version(1).stores(versionOneStores);
    this.version(2).stores(versionTwoStores);
    this.version(3).stores(versionThreeStores);
  }
}
