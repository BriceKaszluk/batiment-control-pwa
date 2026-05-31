"use client";

import type { BatimentControlDatabase } from "@/lib/db/schema";
import { db } from "@/lib/db/dexie";
import { saveLocalMutation } from "@/lib/sync/local-mutation";
import { checklistResultSchema } from "@/lib/validation/schemas";
import type {
  Building,
  ChecklistItem,
  ChecklistResult,
  Control,
} from "@/types/domain";
import type { LocalMutationResult } from "@/types/sync";

export type LocalChecklistEntry = {
  item: ChecklistItem;
  result: ChecklistResult | undefined;
};

export type LocalControlDetail = {
  building: Building | undefined;
  checklist: LocalChecklistEntry[];
  control: Control;
};

export type GetLocalControlDetailOptions = {
  controlId: string;
  database?: BatimentControlDatabase;
  userId: string | null;
};

export type SaveChecklistResultOptions = {
  checklistItemId: string;
  clientMutationId?: string;
  comment?: string | null;
  controlId: string;
  createId?: () => string;
  database?: BatimentControlDatabase;
  now?: () => string;
  status: ChecklistResult["status"];
  userId: string | null;
};

export async function getLocalControlDetail({
  controlId,
  database = db,
  userId,
}: GetLocalControlDetailOptions): Promise<LocalControlDetail | null> {
  if (!userId) {
    return null;
  }

  const control = await database.controls.get(controlId);

  if (!control || control.deletedAt !== null) {
    return null;
  }

  const membership = await database.organizationMembers.get([
    control.organizationId,
    userId,
  ]);

  if (!membership) {
    return null;
  }

  const [building, checklistItems, checklistResults] = await Promise.all([
    database.buildings.get(control.buildingId),
    database.checklistItems
      .where("organizationId")
      .equals(control.organizationId)
      .filter((item) => item.deletedAt === null && item.isActive)
      .toArray(),
    database.checklistResults.where("controlId").equals(control.id).toArray(),
  ]);
  const resultsByItemId = new Map(
    checklistResults.map((result) => [result.checklistItemId, result]),
  );

  return {
    building,
    checklist: checklistItems
      .sort(compareChecklistItems)
      .map((item) => ({
        item,
        result: resultsByItemId.get(item.id),
      })),
    control,
  };
}

export async function saveChecklistResult({
  checklistItemId,
  clientMutationId,
  comment = null,
  controlId,
  createId = () => crypto.randomUUID(),
  database = db,
  now = () => new Date().toISOString(),
  status,
  userId,
}: SaveChecklistResultOptions): Promise<LocalMutationResult<ChecklistResult>> {
  if (!userId) {
    throw new Error("Utilisateur requis pour enregistrer la checklist.");
  }

  const [control, checklistItem] = await Promise.all([
    database.controls.get(controlId),
    database.checklistItems.get(checklistItemId),
  ]);

  if (!control || control.deletedAt !== null) {
    throw new Error("Controle local introuvable.");
  }

  if (
    !checklistItem ||
    checklistItem.deletedAt !== null ||
    !checklistItem.isActive ||
    checklistItem.organizationId !== control.organizationId
  ) {
    throw new Error("Point de checklist local introuvable.");
  }

  const membership = await database.organizationMembers.get([
    control.organizationId,
    userId,
  ]);

  if (!membership) {
    throw new Error("Organisation locale non autorisee.");
  }

  const existingResult = await database.checklistResults
    .where("[controlId+checklistItemId]")
    .equals([control.id, checklistItem.id])
    .first();
  const timestamp = now();
  const checklistResult: ChecklistResult = {
    checklistItemId: checklistItem.id,
    comment: normalizeComment(comment),
    controlId: control.id,
    createdAt: existingResult?.createdAt ?? timestamp,
    id: existingResult?.id ?? createId(),
    organizationId: control.organizationId,
    status,
    updatedAt: timestamp,
  };

  return saveLocalMutation({
    clientMutationId,
    createId,
    database,
    entity: "checklistResults",
    now,
    record: checklistResult,
    schema: checklistResultSchema,
    table: database.checklistResults,
  });
}

export function getChecklistResultStatusLabel(
  status: ChecklistResult["status"],
) {
  if (status === "compliant") {
    return "Conforme";
  }

  if (status === "non_compliant") {
    return "Non conforme";
  }

  return "Non applicable";
}

function compareChecklistItems(
  firstItem: ChecklistItem,
  secondItem: ChecklistItem,
) {
  const positionDifference = firstItem.position - secondItem.position;

  if (positionDifference !== 0) {
    return positionDifference;
  }

  return firstItem.label.localeCompare(secondItem.label, "fr");
}

function normalizeComment(comment: string | null) {
  const trimmedComment = comment?.trim();

  return trimmedComment ? trimmedComment : null;
}
