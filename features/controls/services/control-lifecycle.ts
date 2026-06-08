"use client";

import type { BatimentControlDatabase } from "@/lib/db/schema";
import { db } from "@/lib/db/dexie";
import { enqueueOutboxOperationInCurrentTransaction } from "@/lib/sync/outbox";
import { parseOutboxPayload } from "@/lib/validation/sync-schemas";
import { controlSchema, controlSummarySchema } from "@/lib/validation/schemas";
import type {
  Building,
  ChecklistResult,
  Control,
  ControlPhoto,
  ControlSummary,
  OrganizationMember,
} from "@/types/domain";

export type ControlLifecyclePolicy = {
  archiveAfterDays: number;
  purgePhotosAfterDays: number;
};

export const defaultControlLifecyclePolicy: ControlLifecyclePolicy = {
  archiveAfterDays: 90,
  purgePhotosAfterDays: 365,
};

export type ControlLifecyclePreview = {
  archivableControlCount: number;
  archivedControlCount: number;
  blockedControlCount: number;
  purgeablePhotoCount: number;
  purgeablePhotoControlCount: number;
};

export type ApplyControlLifecyclePolicyOptions = {
  clientMutationId?: string;
  createId?: () => string;
  database?: BatimentControlDatabase;
  now?: () => string;
  policy?: ControlLifecyclePolicy;
  userId: string | null;
};

export type ApplyControlLifecyclePolicyResult = ControlLifecyclePreview & {
  archivedNowCount: number;
  photoPurgedNowCount: number;
  summarizedNowCount: number;
};

type LifecycleCandidate = {
  building: Building | undefined;
  checklistResults: ChecklistResult[];
  control: Control;
  hasBlockingSync: boolean;
  photos: ControlPhoto[];
};

export async function getControlLifecyclePreview({
  database = db,
  now = () => new Date().toISOString(),
  policy = defaultControlLifecyclePolicy,
  userId,
}: ApplyControlLifecyclePolicyOptions): Promise<ControlLifecyclePreview> {
  const candidates = await getLifecycleCandidates({ database, userId });

  return candidates.reduce(
    (preview, candidate) => {
      const isArchived = candidate.control.archivedAt !== null;
      const isBlocked = isLifecycleBlocked(candidate);

      if (isArchived) {
        preview.archivedControlCount += 1;
      }

      if (isArchivable(candidate, policy, now()) && isBlocked) {
        preview.blockedControlCount += 1;
      }

      if (isArchivable(candidate, policy, now()) && !isBlocked) {
        preview.archivableControlCount += 1;
      }

      if (isPhotoPurgeable(candidate, policy, now()) && !isBlocked) {
        const purgeablePhotoCount = getPurgeablePhotos(candidate.photos).length;

        preview.purgeablePhotoControlCount += 1;
        preview.purgeablePhotoCount += purgeablePhotoCount;
      }

      return preview;
    },
    {
      archivableControlCount: 0,
      archivedControlCount: 0,
      blockedControlCount: 0,
      purgeablePhotoControlCount: 0,
      purgeablePhotoCount: 0,
    },
  );
}

export async function applyControlLifecyclePolicy({
  clientMutationId,
  createId = () => crypto.randomUUID(),
  database = db,
  now = () => new Date().toISOString(),
  policy = defaultControlLifecyclePolicy,
  userId,
}: ApplyControlLifecyclePolicyOptions): Promise<ApplyControlLifecyclePolicyResult> {
  const candidates = await getLifecycleCandidates({ database, userId });
  const timestamp = now();
  const batchMutationId = clientMutationId ?? createId();
  const result: ApplyControlLifecyclePolicyResult = {
    ...(await getControlLifecyclePreview({
      database,
      now: () => timestamp,
      policy,
      userId,
    })),
    archivedNowCount: 0,
    photoPurgedNowCount: 0,
    summarizedNowCount: 0,
  };

  await database.transaction(
    "rw",
    database.controls,
    database.controlSummaries,
    database.controlPhotos,
    database.outbox,
    async () => {
      for (const candidate of candidates) {
        if (isLifecycleBlocked(candidate)) {
          continue;
        }

        const shouldArchive = isArchivable(candidate, policy, timestamp);
        const shouldPurgePhotos = isPhotoPurgeable(
          candidate,
          policy,
          timestamp,
        );

        if (!shouldArchive && !shouldPurgePhotos) {
          continue;
        }

        const existingSummary = await database.controlSummaries.get(
          candidate.control.id,
        );
        const summary = controlSummarySchema.parse(
          buildControlSummary(candidate, timestamp, existingSummary),
        );
        await database.controlSummaries.put(summary);
        result.summarizedNowCount += 1;

        await enqueueOutboxOperationInCurrentTransaction(
          database.outbox,
          {
            aggregateId: summary.id,
            clientMutationId: batchMutationId,
            entity: "controlSummaries",
            operationType: "upsert",
            organizationId: summary.organizationId,
            payload: parseOutboxPayload(summary),
          },
          { createId, now: () => timestamp },
        );

        let updatedControl = candidate.control;

        if (shouldArchive) {
          updatedControl = controlSchema.parse({
            ...updatedControl,
            archivedAt: timestamp,
            updatedAt: timestamp,
          });
          result.archivedNowCount += 1;
        }

        if (shouldPurgePhotos) {
          const purgeablePhotos = getPurgeablePhotos(candidate.photos);

          for (const photo of purgeablePhotos) {
            const updatedPhoto: ControlPhoto = {
              ...photo,
              deletedAt: timestamp,
              updatedAt: timestamp,
            };

            await database.controlPhotos.put(updatedPhoto);
            await enqueueOutboxOperationInCurrentTransaction(
              database.outbox,
              {
                aggregateId: photo.id,
                clientMutationId: batchMutationId,
                entity: "controlPhotos",
                operationType: "delete",
                organizationId: photo.organizationId,
                payload: parseOutboxPayload({
                  deletedAt: timestamp,
                  id: photo.id,
                  organizationId: photo.organizationId,
                  remotePath: photo.remotePath,
                  updatedAt: timestamp,
                }),
              },
              { createId, now: () => timestamp },
            );
          }

          updatedControl = controlSchema.parse({
            ...updatedControl,
            photosPurgedAt: timestamp,
            updatedAt: timestamp,
          });
          result.photoPurgedNowCount += purgeablePhotos.length;
        }

        if (updatedControl !== candidate.control) {
          await database.controls.put(updatedControl);
          await enqueueOutboxOperationInCurrentTransaction(
            database.outbox,
            {
              aggregateId: updatedControl.id,
              clientMutationId: batchMutationId,
              entity: "controls",
              operationType: "upsert",
              organizationId: updatedControl.organizationId,
              payload: parseOutboxPayload(updatedControl),
            },
            { createId, now: () => timestamp },
          );
        }
      }
    },
  );

  return result;
}

async function getLifecycleCandidates({
  database,
  userId,
}: {
  database: BatimentControlDatabase;
  userId: string | null;
}): Promise<LifecycleCandidate[]> {
  if (!userId) {
    return [];
  }

  const organizationIds = await getAuthorizedOrganizationIds(database, userId);

  if (organizationIds.length === 0) {
    return [];
  }

  const controls = await database.controls
    .where("organizationId")
    .anyOf(organizationIds)
    .filter(
      (control) =>
        control.deletedAt === null &&
        control.status === "completed" &&
        control.completedAt !== null,
    )
    .toArray();

  return Promise.all(
    controls.map(async (control) => {
      const [building, checklistResults, photos] =
        await Promise.all([
          database.buildings.get(control.buildingId),
          database.checklistResults.where("controlId").equals(control.id).toArray(),
          database.controlPhotos
            .where("controlId")
            .equals(control.id)
            .filter((photo) => photo.deletedAt === null)
            .toArray(),
        ]);

      return {
        building,
        checklistResults,
        control,
        hasBlockingSync: await hasBlockingSync(database, {
          checklistResults,
          control,
          photos,
        }),
        photos,
      };
    }),
  );
}

async function getAuthorizedOrganizationIds(
  database: BatimentControlDatabase,
  userId: string,
) {
  const organizationMembers: OrganizationMember[] =
    await database.organizationMembers.where("userId").equals(userId).toArray();

  return [
    ...new Set(organizationMembers.map((member) => member.organizationId)),
  ];
}

async function hasBlockingSync(
  database: BatimentControlDatabase,
  candidate: {
    checklistResults: ChecklistResult[];
    control: Control;
    photos: ControlPhoto[];
  },
) {
  const relatedAggregateIds = new Set([
    candidate.control.id,
    ...candidate.checklistResults.map((result) => result.id),
    ...candidate.photos.map((photo) => photo.id),
  ]);

  const [blockingOutboxCount, blockingPhotoUploadCount] = await Promise.all([
    database.outbox
      .where("organizationId")
      .equals(candidate.control.organizationId)
      .filter(
        (operation) =>
          operation.status !== "synced" &&
          relatedAggregateIds.has(operation.aggregateId),
      )
      .count(),
    database.photoUploads
      .where("controlId")
      .equals(candidate.control.id)
      .filter((upload) => upload.status !== "synced")
      .count(),
  ]);

  return blockingOutboxCount > 0 || blockingPhotoUploadCount > 0;
}

function buildControlSummary(
  candidate: LifecycleCandidate,
  timestamp: string,
  existingSummary: ControlSummary | undefined,
): ControlSummary {
  const activePhotos = candidate.photos.filter((photo) => photo.deletedAt === null);
  const nonCompliantResultCount = candidate.checklistResults.filter(
    (result) => result.status === "non_compliant",
  ).length;

  return {
    buildingAddress:
      candidate.building?.address?.trim() || existingSummary?.buildingAddress || null,
    buildingId: candidate.control.buildingId,
    buildingName:
      candidate.building?.name?.trim() ||
      existingSummary?.buildingName ||
      "Batiment non disponible",
    checklistResultCount: candidate.checklistResults.length,
    completedAt: candidate.control.completedAt,
    controlId: candidate.control.id,
    controlledBy: candidate.control.controlledBy,
    correctiveActionCount: 0,
    createdAt: existingSummary?.createdAt ?? timestamp,
    deletedAt: null,
    generalComment: candidate.control.generalComment,
    id: candidate.control.id,
    nonCompliantResultCount,
    organizationId: candidate.control.organizationId,
    photoCount: Math.max(existingSummary?.photoCount ?? 0, activePhotos.length),
    qualityRating: candidate.control.qualityRating,
    sector:
      candidate.building?.sector?.trim() ||
      existingSummary?.sector ||
      "Secteur non renseigne",
    startedAt: candidate.control.startedAt,
    status: candidate.control.status,
    updatedAt: timestamp,
  };
}

function isLifecycleBlocked(candidate: LifecycleCandidate) {
  return candidate.hasBlockingSync;
}

function isArchivable(
  candidate: LifecycleCandidate,
  policy: ControlLifecyclePolicy,
  now: string,
) {
  return (
    candidate.control.archivedAt === null &&
    isControlOlderThan(candidate.control, policy.archiveAfterDays, now)
  );
}

function isPhotoPurgeable(
  candidate: LifecycleCandidate,
  policy: ControlLifecyclePolicy,
  now: string,
) {
  return (
    candidate.control.photosPurgedAt === null &&
    isControlOlderThan(candidate.control, policy.purgePhotosAfterDays, now) &&
    getPurgeablePhotos(candidate.photos).length > 0
  );
}

function getPurgeablePhotos(photos: ControlPhoto[]) {
  return photos.filter(
    (photo) =>
      photo.deletedAt === null &&
      photo.remotePath !== null &&
      photo.uploadStatus === "synced",
  );
}

function isControlOlderThan(control: Control, days: number, now: string) {
  if (!control.completedAt) {
    return false;
  }

  return Date.parse(control.completedAt) <= Date.parse(now) - days * 86_400_000;
}
