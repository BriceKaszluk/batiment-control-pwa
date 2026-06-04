"use client";

import type { BatimentControlDatabase } from "@/lib/db/schema";
import { db } from "@/lib/db/dexie";
import { saveLocalMutation } from "@/lib/sync/local-mutation";
import { correctiveActionSchema } from "@/lib/validation/schemas";
import type { Building, CorrectiveAction } from "@/types/domain";
import type { LocalMutationResult } from "@/types/sync";

export {
  getCorrectiveActionPriorityLabel,
  getCorrectiveActionStatusLabel,
} from "@/features/corrective-actions/services/corrective-action-labels";

export type LocalCorrectiveActionSummary = {
  action: CorrectiveAction;
  building: Building | undefined;
};

export type CreateCorrectiveActionForControlOptions = {
  clientMutationId?: string;
  controlId: string;
  createId?: () => string;
  database?: BatimentControlDatabase;
  description?: string | null;
  dueDate?: string | null;
  now?: () => string;
  priority: CorrectiveAction["priority"];
  title: string;
  userId: string | null;
};

export type ListCorrectiveActionsForUserOptions = {
  database?: BatimentControlDatabase;
  includeClosed?: boolean;
  userId: string | null;
};

export type UpdateCorrectiveActionStatusOptions = {
  actionId: string;
  clientMutationId?: string;
  createId?: () => string;
  database?: BatimentControlDatabase;
  now?: () => string;
  status: CorrectiveAction["status"];
  userId: string | null;
};

export async function createCorrectiveActionForControl({
  clientMutationId,
  controlId,
  createId = () => crypto.randomUUID(),
  database = db,
  description = null,
  dueDate = null,
  now = () => new Date().toISOString(),
  priority,
  title,
  userId,
}: CreateCorrectiveActionForControlOptions): Promise<
  LocalMutationResult<CorrectiveAction>
> {
  if (!userId) {
    throw new Error("Utilisateur requis pour creer une reprise.");
  }

  const control = await database.controls.get(controlId);

  if (!control || control.deletedAt !== null) {
    throw new Error("Controle local introuvable.");
  }

  const membership = await database.organizationMembers.get([
    control.organizationId,
    userId,
  ]);

  if (!membership) {
    throw new Error("Organisation locale non autorisee.");
  }

  const timestamp = now();
  const correctiveAction: CorrectiveAction = {
    assignedTo: null,
    buildingId: control.buildingId,
    controlId: control.id,
    createdAt: timestamp,
    createdBy: userId,
    deletedAt: null,
    description: normalizeOptionalText(description),
    dueDate: normalizeDueDate(dueDate),
    id: createId(),
    organizationId: control.organizationId,
    priority,
    resolvedAt: null,
    status: "open",
    title: title.trim(),
    updatedAt: timestamp,
  };

  return saveLocalMutation({
    clientMutationId,
    createId,
    database,
    entity: "correctiveActions",
    now,
    record: correctiveAction,
    schema: correctiveActionSchema,
    table: database.correctiveActions,
  });
}

export async function listCorrectiveActionsForUser({
  database = db,
  includeClosed = false,
  userId,
}: ListCorrectiveActionsForUserOptions): Promise<
  LocalCorrectiveActionSummary[]
> {
  if (!userId) {
    return [];
  }

  const organizationMembers = await database.organizationMembers
    .where("userId")
    .equals(userId)
    .toArray();
  const organizationIds = [
    ...new Set(organizationMembers.map((member) => member.organizationId)),
  ];

  if (organizationIds.length === 0) {
    return [];
  }

  const actions = await database.correctiveActions
    .where("organizationId")
    .anyOf(organizationIds)
    .filter(
      (action) =>
        action.deletedAt === null &&
        (includeClosed || !isClosedCorrectiveAction(action.status)),
    )
    .toArray();
  const sortedActions = actions.sort(compareCorrectiveActions);

  return Promise.all(
    sortedActions.map(async (action) => ({
      action,
      building: await database.buildings.get(action.buildingId),
    })),
  );
}

export async function updateCorrectiveActionStatus({
  actionId,
  clientMutationId,
  createId = () => crypto.randomUUID(),
  database = db,
  now = () => new Date().toISOString(),
  status,
  userId,
}: UpdateCorrectiveActionStatusOptions): Promise<
  LocalMutationResult<CorrectiveAction>
> {
  if (!userId) {
    throw new Error("Utilisateur requis pour modifier une reprise.");
  }

  const action = await database.correctiveActions.get(actionId);

  if (!action || action.deletedAt !== null) {
    throw new Error("Reprise locale introuvable.");
  }

  const membership = await database.organizationMembers.get([
    action.organizationId,
    userId,
  ]);

  if (!membership) {
    throw new Error("Organisation locale non autorisee.");
  }

  const timestamp = now();
  const updatedAction: CorrectiveAction = {
    ...action,
    resolvedAt: status === "done" ? timestamp : null,
    status,
    updatedAt: timestamp,
  };

  return saveLocalMutation({
    clientMutationId,
    createId,
    database,
    entity: "correctiveActions",
    now,
    record: updatedAction,
    schema: correctiveActionSchema,
    table: database.correctiveActions,
  });
}

function compareCorrectiveActions(
  firstAction: CorrectiveAction,
  secondAction: CorrectiveAction,
) {
  const statusDifference =
    getStatusRank(firstAction.status) - getStatusRank(secondAction.status);

  if (statusDifference !== 0) {
    return statusDifference;
  }

  const priorityDifference =
    getPriorityRank(secondAction.priority) - getPriorityRank(firstAction.priority);

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  const dueDateDifference =
    getDueDateRank(firstAction.dueDate) - getDueDateRank(secondAction.dueDate);

  if (dueDateDifference !== 0) {
    return dueDateDifference;
  }

  return Date.parse(secondAction.createdAt) - Date.parse(firstAction.createdAt);
}

function getDueDateRank(dueDate: string | null) {
  return dueDate ? Date.parse(`${dueDate}T00:00:00.000Z`) : Number.MAX_SAFE_INTEGER;
}

function getPriorityRank(priority: CorrectiveAction["priority"]) {
  if (priority === "high") {
    return 3;
  }

  if (priority === "normal") {
    return 2;
  }

  return 1;
}

function getStatusRank(status: CorrectiveAction["status"]) {
  if (status === "open") {
    return 0;
  }

  if (status === "in_progress") {
    return 1;
  }

  return 2;
}

function isClosedCorrectiveAction(status: CorrectiveAction["status"]) {
  return status === "done" || status === "canceled";
}

function normalizeDueDate(dueDate: string | null) {
  const trimmedDate = dueDate?.trim();

  return trimmedDate ? trimmedDate : null;
}

function normalizeOptionalText(text: string | null) {
  const trimmedText = text?.trim();

  return trimmedText ? trimmedText : null;
}
