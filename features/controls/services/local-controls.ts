"use client";

import type { BatimentControlDatabase } from "@/lib/db/schema";
import { db } from "@/lib/db/dexie";
import { saveLocalMutation } from "@/lib/sync/local-mutation";
import { enqueueOutboxOperationInCurrentTransaction } from "@/lib/sync/outbox";
import { parseOutboxPayload } from "@/lib/validation/sync-schemas";
import { buildingSchema, controlSchema } from "@/lib/validation/schemas";
import type { Building, Control } from "@/types/domain";
import type { OutboxOperation } from "@/types/sync";

export { getControlStatusLabel } from "@/features/controls/services/control-labels";

export type LocalControlSummary = {
  building: Building | undefined;
  control: Control;
};

export type LocalControlHistorySummary = LocalControlSummary & {
  checklistResultCount: number;
  correctiveActionCount: number;
  photoCount: number;
};

export type CompleteControlResult = {
  building: Building;
  control: Control;
  outboxOperations: [OutboxOperation, OutboxOperation];
};

export type StartDraftControlResult = {
  outboxOperation: OutboxOperation | null;
  record: Control;
  reusedExisting: boolean;
};

export type CompleteControlOptions = {
  clientMutationId?: string;
  controlId: string;
  createId?: () => string;
  database?: BatimentControlDatabase;
  now?: () => string;
  userId: string | null;
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

export type ListControlHistoryForUserOptions = ListControlsForUserOptions;

export async function completeControl({
  clientMutationId,
  controlId,
  createId = () => crypto.randomUUID(),
  database = db,
  now = () => new Date().toISOString(),
  userId,
}: CompleteControlOptions): Promise<CompleteControlResult> {
  if (!userId) {
    throw new Error("Utilisateur requis pour terminer un controle.");
  }

  const control = await database.controls.get(controlId);

  if (!control || control.deletedAt !== null) {
    throw new Error("Controle local introuvable.");
  }

  if (control.status === "completed") {
    throw new Error("Controle deja termine.");
  }

  const [building, membership] = await Promise.all([
    database.buildings.get(control.buildingId),
    database.organizationMembers.get([control.organizationId, userId]),
  ]);

  if (!membership) {
    throw new Error("Organisation locale non autorisee.");
  }

  if (!building || building.deletedAt !== null) {
    throw new Error("Batiment local introuvable.");
  }

  if (building.organizationId !== control.organizationId) {
    throw new Error("Batiment local incoherent.");
  }

  const timestamp = now();
  const updatedControl = controlSchema.parse({
    ...control,
    completedAt: timestamp,
    status: "completed",
    updatedAt: timestamp,
  });
  const updatedBuilding = buildingSchema.parse({
    ...building,
    lastControlAt: timestamp,
    updatedAt: timestamp,
  });
  const mutationId = clientMutationId ?? createId();
  let result: CompleteControlResult | undefined;

  await database.transaction(
    "rw",
    database.controls,
    database.buildings,
    database.outbox,
    async () => {
      await database.controls.put(updatedControl);
      await database.buildings.put(updatedBuilding);

      const controlOperation =
        await enqueueOutboxOperationInCurrentTransaction(
          database.outbox,
          {
            aggregateId: updatedControl.id,
            clientMutationId: mutationId,
            entity: "controls",
            operationType: "upsert",
            organizationId: updatedControl.organizationId,
            payload: parseOutboxPayload(updatedControl),
          },
          { createId, now },
        );
      const buildingOperation =
        await enqueueOutboxOperationInCurrentTransaction(
          database.outbox,
          {
            aggregateId: updatedBuilding.id,
            clientMutationId: mutationId,
            entity: "buildings",
            operationType: "upsert",
            organizationId: updatedBuilding.organizationId,
            payload: parseOutboxPayload(updatedBuilding),
          },
          { createId, now },
        );

      result = {
        building: updatedBuilding,
        control: updatedControl,
        outboxOperations: [controlOperation, buildingOperation],
      };
    },
  );

  if (!result) {
    throw new Error("Controle local non termine.");
  }

  return result;
}

export async function startDraftControl({
  building,
  clientMutationId,
  createId = () => crypto.randomUUID(),
  database = db,
  now = () => new Date().toISOString(),
  userId,
}: StartDraftControlOptions): Promise<StartDraftControlResult> {
  if (!userId) {
    throw new Error("Utilisateur requis pour demarrer un controle.");
  }

  const existingDraftControl = await findExistingDraftControl({
    building,
    database,
    userId,
  });

  if (existingDraftControl) {
    return {
      outboxOperation: null,
      record: existingDraftControl,
      reusedExisting: true,
    };
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

  const result = await saveLocalMutation({
    clientMutationId,
    createId,
    database,
    entity: "controls",
    now,
    record: control,
    schema: controlSchema,
    table: database.controls,
  });

  return {
    ...result,
    reusedExisting: false,
  };
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

export async function listControlHistoryForUser({
  database = db,
  limit,
  userId,
}: ListControlHistoryForUserOptions): Promise<LocalControlHistorySummary[]> {
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
    .filter(
      (control) => control.deletedAt === null && control.status === "completed",
    )
    .toArray();
  const sortedControls = controls.sort(compareControlsByCompletedAt);
  const limitedControls =
    typeof limit === "number" ? sortedControls.slice(0, limit) : sortedControls;

  return Promise.all(
    limitedControls.map(async (control) => ({
      building: await database.buildings.get(control.buildingId),
      checklistResultCount: await database.checklistResults
        .where("controlId")
        .equals(control.id)
        .count(),
      control,
      correctiveActionCount: await database.correctiveActions
        .where("controlId")
        .equals(control.id)
        .filter((action) => action.deletedAt === null)
        .count(),
      photoCount: await database.controlPhotos
        .where("controlId")
        .equals(control.id)
        .filter((photo) => photo.deletedAt === null)
        .count(),
    })),
  );
}

function compareControlsByStartedAt(firstControl: Control, secondControl: Control) {
  return Date.parse(secondControl.startedAt) - Date.parse(firstControl.startedAt);
}

function compareControlsByCompletedAt(
  firstControl: Control,
  secondControl: Control,
) {
  return (
    toControlCompletionRank(secondControl) - toControlCompletionRank(firstControl)
  );
}

function toControlCompletionRank(control: Control) {
  return Date.parse(control.completedAt ?? control.startedAt);
}

async function findExistingDraftControl({
  building,
  database,
  userId,
}: {
  building: Building;
  database: BatimentControlDatabase;
  userId: string;
}): Promise<Control | null> {
  const draftControls = await database.controls
    .where("[organizationId+buildingId]")
    .equals([building.organizationId, building.id])
    .filter(
      (control) =>
        control.controlledBy === userId &&
        control.deletedAt === null &&
        control.status === "draft",
    )
    .toArray();
  const [latestDraftControl] = draftControls.sort(compareControlsByStartedAt);

  return latestDraftControl ?? null;
}
