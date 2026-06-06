"use client";

import Dexie, { type Table } from "dexie";

import type {
  Agent,
  Building,
  BuildingSector,
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
import { normalizeBuildingAreaList } from "@/lib/validation/schemas";

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

const versionFourStores = {
  ...versionThreeStores,
  buildings:
    "&id, organizationId, deletedAt, updatedAt, priorityLevel, [organizationId+deletedAt], [organizationId+priorityLevel]",
};

const versionFiveStores = {
  ...versionFourStores,
  organizations: "&id, name, ownerId, workspaceType, updatedAt, [workspaceType+ownerId]",
};

const versionSixStores = {
  ...versionFiveStores,
};

const versionSevenStores = {
  ...versionSixStores,
  agents:
    "&id, organizationId, status, deletedAt, updatedAt, [organizationId+deletedAt], [organizationId+status]",
  buildings:
    "&id, organizationId, assignedAgentId, deletedAt, updatedAt, priorityLevel, [organizationId+deletedAt], [organizationId+priorityLevel], [organizationId+assignedAgentId]",
};

const versionEightStores = {
  ...versionSevenStores,
  buildingSectors:
    "&id, organizationId, name, deletedAt, updatedAt, [organizationId+deletedAt]",
};

export class BatimentControlDatabase extends Dexie {
  agents!: Table<Agent, string>;
  buildings!: Table<Building, string>;
  buildingSectors!: Table<BuildingSector, string>;
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
    this.version(4)
      .stores(versionFourStores)
      .upgrade((tx) =>
        tx
          .table("buildings")
          .toCollection()
          .modify((building) => {
            const record = building as Record<string, unknown>;

            // Ensure new required fields exist on older local rows.
            record.address =
              typeof record.address === "string" && record.address.trim().length > 0
                ? record.address
                : "Adresse non renseignee";
            record.sector =
              typeof record.sector === "string" && record.sector.trim().length > 0
                ? record.sector
                : "Secteur non renseigne";
            record.agentStatus =
              typeof record.agentStatus === "string" ? record.agentStatus : "unknown";
            record.assignedAgentName =
              record.assignedAgentName === undefined ? null : record.assignedAgentName;
            record.internalNotes =
              record.internalNotes === undefined ? (record.accessNotes ?? null) : record.internalNotes;
            record.serviceDays =
              Array.isArray(record.serviceDays) ? record.serviceDays : [];
            record.areasToCheck =
              Array.isArray(record.areasToCheck) ? record.areasToCheck : [];

            if (typeof record.priorityLevel !== "string") {
              const legacyScore =
                typeof record.priorityScore === "number" ? record.priorityScore : 50;

              record.priorityLevel =
                legacyScore >= 85
                  ? "critical"
                  : legacyScore >= 70
                    ? "high"
                    : legacyScore <= 30
                      ? "low"
                      : "normal";
            }
          }),
      );
    this.version(5)
      .stores(versionFiveStores)
      .upgrade((tx) =>
        tx
          .table("organizations")
          .toCollection()
          .modify((organization) => {
            const record = organization as Record<string, unknown>;

            record.ownerId =
              typeof record.ownerId === "string" ? record.ownerId : null;
            record.workspaceType =
              record.workspaceType === "personal" || record.workspaceType === "team"
                ? record.workspaceType
                : "team";
          }),
      );
    this.version(6)
      .stores(versionSixStores)
      .upgrade((tx) =>
        tx
          .table("buildings")
          .toCollection()
          .modify((building) => {
            const record = building as Record<string, unknown>;

            record.areasToCheck = normalizeBuildingAreaList(
              record.areasToCheck,
            );
          }),
      );
    this.version(7)
      .stores(versionSevenStores)
      .upgrade((tx) =>
        tx
          .table("buildings")
          .toCollection()
          .modify((building) => {
            const record = building as Record<string, unknown>;

            record.assignedAgentId =
              typeof record.assignedAgentId === "string"
                ? record.assignedAgentId
                : null;
          }),
      );
    this.version(8).stores(versionEightStores);
  }
}
