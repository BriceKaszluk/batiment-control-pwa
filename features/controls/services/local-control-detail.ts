"use client";

import type { BatimentControlDatabase } from "@/lib/db/schema";
import { db } from "@/lib/db/dexie";
import { saveLocalMutation } from "@/lib/sync/local-mutation";
import {
  controlAreaResultSchema,
  controlQualityRatingSchema,
  controlSchema,
} from "@/lib/validation/schemas";
import type {
  Agent,
  Building,
  ControlAreaResult,
  Control,
  ControlPhoto,
} from "@/types/domain";
import type { LocalMutationResult } from "@/types/sync";

export {
  getControlQualityRatingLabel,
} from "@/features/controls/services/control-labels";

export type LocalControlAreaEntry = {
  area: Building["areasToCheck"][number];
  result: ControlAreaResult | undefined;
};

export type LocalControlDetail = {
  agent: Agent | null;
  areaResults: LocalControlAreaEntry[];
  building: Building | undefined;
  control: Control;
  photos: ControlPhoto[];
};

export type GetLocalControlDetailOptions = {
  controlId: string;
  database?: BatimentControlDatabase;
  userId: string | null;
};

export type SaveControlAreaResultOptions = {
  area: Building["areasToCheck"][number];
  clientMutationId?: string;
  controlId: string;
  createId?: () => string;
  database?: BatimentControlDatabase;
  now?: () => string;
  status: ControlAreaResult["status"];
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

  const [building, areaResults, photos] = await Promise.all([
    database.buildings.get(control.buildingId),
    database.controlAreaResults.where("controlId").equals(control.id).toArray(),
    database.controlPhotos
      .where("controlId")
      .equals(control.id)
      .filter((photo) => photo.deletedAt === null)
      .toArray(),
  ]);
  const resultsByArea = new Map(
    areaResults.map((result) => [result.area, result]),
  );
  const agent = building?.assignedAgentId
    ? await database.agents.get(building.assignedAgentId)
    : undefined;

  return {
    agent: agent && agent.deletedAt === null ? agent : null,
    areaResults: (building?.areasToCheck ?? []).map((area) => ({
      area,
      result: resultsByArea.get(area),
    })),
    building,
    control,
    photos: photos.sort(comparePhotos),
  };
}

export async function saveControlAreaResult({
  area,
  clientMutationId,
  controlId,
  createId = () => crypto.randomUUID(),
  database = db,
  now = () => new Date().toISOString(),
  status,
  userId,
}: SaveControlAreaResultOptions): Promise<LocalMutationResult<ControlAreaResult>> {
  if (!userId) {
    throw new Error("Utilisateur requis pour enregistrer l'element controle.");
  }

  const control = await database.controls.get(controlId);

  if (!control || control.deletedAt !== null) {
    throw new Error("Controle local introuvable.");
  }

  const [building, membership] = await Promise.all([
    database.buildings.get(control.buildingId),
    database.organizationMembers.get([control.organizationId, userId]),
  ]);

  if (!membership) {
    throw new Error("Organisation locale non autorisee.");
  }

  if (
    !building ||
    building.deletedAt !== null ||
    building.organizationId !== control.organizationId ||
    !building.areasToCheck.includes(area)
  ) {
    throw new Error("Element a controler introuvable.");
  }

  const existingResult = await database.controlAreaResults
    .where("[controlId+area]")
    .equals([control.id, area])
    .first();
  const timestamp = now();
  const areaResult: ControlAreaResult = {
    area,
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
    entity: "controlAreaResults",
    now,
    record: areaResult,
    schema: controlAreaResultSchema,
    table: database.controlAreaResults,
  });
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

function comparePhotos(firstPhoto: ControlPhoto, secondPhoto: ControlPhoto) {
  return Date.parse(secondPhoto.createdAt) - Date.parse(firstPhoto.createdAt);
}

function normalizeComment(comment: string | null) {
  const trimmedComment = comment?.trim();

  return trimmedComment ? trimmedComment : null;
}
