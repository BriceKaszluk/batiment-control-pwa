"use client";

import type { BatimentControlDatabase } from "@/lib/db/schema";
import { db } from "@/lib/db/dexie";
import { saveLocalMutation } from "@/lib/sync/local-mutation";
import { controlSchema } from "@/lib/validation/schemas";
import type { Building, Control } from "@/types/domain";
import type { LocalMutationResult } from "@/types/sync";

export type LocalControlSummary = {
  building: Building | undefined;
  control: Control;
};

export type StartDraftControlOptions = {
  building: Building;
  clientMutationId?: string;
  createId?: () => string;
  database?: BatimentControlDatabase;
  now?: () => string;
  userId: string | null;
};

export type ListControlsForUserOptions = {
  database?: BatimentControlDatabase;
  limit?: number;
  userId: string | null;
};

export async function startDraftControl({
  building,
  clientMutationId,
  createId = () => crypto.randomUUID(),
  database = db,
  now = () => new Date().toISOString(),
  userId,
}: StartDraftControlOptions): Promise<LocalMutationResult<Control>> {
  if (!userId) {
    throw new Error("Utilisateur requis pour demarrer un controle.");
  }

  const timestamp = now();
  const control: Control = {
    buildingId: building.id,
    completedAt: null,
    controlledBy: userId,
    createdAt: timestamp,
    deletedAt: null,
    generalComment: null,
    id: createId(),
    organizationId: building.organizationId,
    startedAt: timestamp,
    status: "draft",
    updatedAt: timestamp,
  };

  return saveLocalMutation({
    clientMutationId,
    createId,
    database,
    entity: "controls",
    now,
    record: control,
    schema: controlSchema,
    table: database.controls,
  });
}

export async function listControlsForUser({
  database = db,
  limit,
  userId,
}: ListControlsForUserOptions): Promise<LocalControlSummary[]> {
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

  const controls = await database.controls
    .where("organizationId")
    .anyOf(organizationIds)
    .filter((control) => control.deletedAt === null)
    .toArray();
  const sortedControls = controls.sort(compareControlsByStartedAt);
  const limitedControls =
    typeof limit === "number" ? sortedControls.slice(0, limit) : sortedControls;

  return Promise.all(
    limitedControls.map(async (control) => ({
      building: await database.buildings.get(control.buildingId),
      control,
    })),
  );
}

export function getControlStatusLabel(status: Control["status"]) {
  if (status === "completed") {
    return "Termine";
  }

  if (status === "canceled") {
    return "Annule";
  }

  return "Brouillon";
}

function compareControlsByStartedAt(firstControl: Control, secondControl: Control) {
  return Date.parse(secondControl.startedAt) - Date.parse(firstControl.startedAt);
}
