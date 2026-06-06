"use client";

import type { BatimentControlDatabase } from "@/lib/db/schema";
import { db } from "@/lib/db/dexie";
import { saveLocalMutation } from "@/lib/sync/local-mutation";
import {
  checklistResultSchema,
  controlQualityRatingSchema,
  controlSchema,
} from "@/lib/validation/schemas";
import type {
  Building,
  ChecklistItem,
  ChecklistResult,
  Control,
  ControlPhoto,
  CorrectiveAction,
} from "@/types/domain";
import type { LocalMutationResult } from "@/types/sync";

export {
  getControlQualityRatingLabel,
  getChecklistResultStatusLabel,
} from "@/features/controls/services/control-labels";

export type LocalChecklistEntry = {
  item: ChecklistItem;
  result: ChecklistResult | undefined;
};

export type LocalControlDetail = {
  building: Building | undefined;
  checklist: LocalChecklistEntry[];
  control: Control;
  correctiveActions: CorrectiveAction[];
  photos: ControlPhoto[];
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

export type SaveControlCommentOptions = {
  clientMutationId?: string;
  comment: string | null;
  controlId: string;
  createId?: () => string;
  database?: BatimentControlDatabase;
  now?: () => string;
  userId: string | null;
};

export type SaveControlQualityRatingOptions = {
  clientMutationId?: string;
  controlId: string;
  createId?: () => string;
  database?: BatimentControlDatabase;
  now?: () => string;
  qualityRating: NonNullable<Control["qualityRating"]>;
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

  const [
    building,
    checklistItems,
    checklistResults,
    correctiveActions,
    photos,
  ] = await Promise.all([
    database.buildings.get(control.buildingId),
    database.checklistItems
      .where("organizationId")
      .equals(control.organizationId)
      .filter((item) => item.deletedAt === null && item.isActive)
      .toArray(),
    database.checklistResults.where("controlId").equals(control.id).toArray(),
    database.correctiveActions
      .where("controlId")
      .equals(control.id)
      .filter((action) => action.deletedAt === null)
      .toArray(),
    database.controlPhotos
      .where("controlId")
      .equals(control.id)
      .filter((photo) => photo.deletedAt === null)
      .toArray(),
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
    correctiveActions: correctiveActions.sort(compareCorrectiveActions),
    photos: photos.sort(comparePhotos),
  };
}

export async function saveControlComment({
  clientMutationId,
  comment,
  controlId,
  createId = () => crypto.randomUUID(),
  database = db,
  now = () => new Date().toISOString(),
  userId,
}: SaveControlCommentOptions): Promise<LocalMutationResult<Control>> {
  if (!userId) {
    throw new Error("Utilisateur requis pour enregistrer le commentaire.");
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

  const updatedControl: Control = {
    ...control,
    generalComment: normalizeComment(comment),
    updatedAt: now(),
  };

  return saveLocalMutation({
    clientMutationId,
    createId,
    database,
    entity: "controls",
    now,
    record: updatedControl,
    schema: controlSchema,
    table: database.controls,
  });
}

export async function saveControlQualityRating({
  clientMutationId,
  controlId,
  createId = () => crypto.randomUUID(),
  database = db,
  now = () => new Date().toISOString(),
  qualityRating,
  userId,
}: SaveControlQualityRatingOptions): Promise<LocalMutationResult<Control>> {
  if (!userId) {
    throw new Error("Utilisateur requis pour enregistrer l'etat global.");
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

  const updatedControl: Control = {
    ...control,
    qualityRating: controlQualityRatingSchema.parse(qualityRating),
    updatedAt: now(),
  };

  return saveLocalMutation({
    clientMutationId,
    createId,
    database,
    entity: "controls",
    now,
    record: updatedControl,
    schema: controlSchema,
    table: database.controls,
  });
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

function compareCorrectiveActions(
  firstAction: CorrectiveAction,
  secondAction: CorrectiveAction,
) {
  return Date.parse(secondAction.createdAt) - Date.parse(firstAction.createdAt);
}

function comparePhotos(firstPhoto: ControlPhoto, secondPhoto: ControlPhoto) {
  return Date.parse(secondPhoto.createdAt) - Date.parse(firstPhoto.createdAt);
}

function normalizeComment(comment: string | null) {
  const trimmedComment = comment?.trim();

  return trimmedComment ? trimmedComment : null;
}
