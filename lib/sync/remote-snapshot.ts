"use client";

import type { Table } from "dexie";
import type { z } from "zod";

import type { BatimentControlDatabase } from "@/lib/db/schema";
import { db } from "@/lib/db/dexie";
import { shouldUseIncomingVersion } from "@/lib/sync/conflicts";
import {
  buildingSchema,
  checklistItemSchema,
  checklistResultSchema,
  controlSchema,
  correctiveActionSchema,
  organizationMemberSchema,
  organizationSchema,
} from "@/lib/validation/schemas";
import type {
  Building,
  ChecklistItem,
  ChecklistResult,
  Control,
  CorrectiveAction,
  Organization,
  OrganizationMember,
} from "@/types/domain";

export type RemoteSnapshot = {
  buildings: Building[];
  checklistItems: ChecklistItem[];
  checklistResults: ChecklistResult[];
  controls: Control[];
  correctiveActions: CorrectiveAction[];
  organizationMembers: OrganizationMember[];
  organizations: Organization[];
};

type VersionedEntity = {
  id: string;
  updatedAt: string;
};

export function createEmptyRemoteSnapshot(): RemoteSnapshot {
  return {
    buildings: [],
    checklistItems: [],
    checklistResults: [],
    controls: [],
    correctiveActions: [],
    organizationMembers: [],
    organizations: [],
  };
}

export async function saveRemoteSnapshot(
  snapshot: RemoteSnapshot,
  database: BatimentControlDatabase = db,
) {
  await database.transaction(
    "rw",
    [
      database.organizations,
      database.organizationMembers,
      database.buildings,
      database.checklistItems,
      database.controls,
      database.checklistResults,
      database.correctiveActions,
    ],
    async () => {
      await putVersionedRecords(
        database.organizations,
        organizationSchema,
        snapshot.organizations,
      );
      await putOrganizationMembers(
        database.organizationMembers,
        snapshot.organizationMembers,
      );
      await putVersionedRecords(
        database.buildings,
        buildingSchema,
        snapshot.buildings,
      );
      await putVersionedRecords(
        database.checklistItems,
        checklistItemSchema,
        snapshot.checklistItems,
      );
      await putVersionedRecords(
        database.controls,
        controlSchema,
        snapshot.controls,
      );
      await putVersionedRecords(
        database.checklistResults,
        checklistResultSchema,
        snapshot.checklistResults,
      );
      await putVersionedRecords(
        database.correctiveActions,
        correctiveActionSchema,
        snapshot.correctiveActions,
      );
    },
  );
}

async function putVersionedRecords<TEntity extends VersionedEntity>(
  table: Table<TEntity, string>,
  schema: z.ZodType<TEntity>,
  records: readonly TEntity[],
) {
  for (const record of records) {
    const parsedRecord = schema.parse(record);
    const currentRecord = await table.get(parsedRecord.id);

    if (
      !currentRecord ||
      shouldUseIncomingVersion(currentRecord.updatedAt, parsedRecord.updatedAt)
    ) {
      await table.put(parsedRecord);
    }
  }
}

async function putOrganizationMembers(
  table: Table<OrganizationMember, [string, string]>,
  records: readonly OrganizationMember[],
) {
  const parsedRecords = records.map((record) =>
    organizationMemberSchema.parse(record),
  );

  await table.bulkPut(parsedRecords);
}
