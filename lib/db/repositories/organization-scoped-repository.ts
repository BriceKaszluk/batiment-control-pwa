import type { Table } from "dexie";
import type { z } from "zod";

export type OrganizationScopedEntity = {
  id: string;
  organizationId: string;
};

export type OrganizationScopedRepository<TEntity extends OrganizationScopedEntity> = {
  bulkSaveSynced(records: readonly TEntity[]): Promise<string[]>;
  getById(id: string): Promise<TEntity | undefined>;
  listByOrganization(organizationId: string): Promise<TEntity[]>;
  saveSynced(record: TEntity): Promise<string>;
};

export function createOrganizationScopedRepository<
  TEntity extends OrganizationScopedEntity,
>(
  table: Table<TEntity, string>,
  schema: z.ZodType<TEntity>,
): OrganizationScopedRepository<TEntity> {
  return {
    async bulkSaveSynced(records) {
      const parsedRecords = records.map((record) => schema.parse(record));

      await table.bulkPut(parsedRecords);

      return parsedRecords.map((record) => record.id);
    },

    async getById(id) {
      return table.get(id);
    },

    async listByOrganization(organizationId) {
      return table.where("organizationId").equals(organizationId).toArray();
    },

    async saveSynced(record) {
      const parsedRecord = schema.parse(record);

      await table.put(parsedRecord);

      return parsedRecord.id;
    },
  };
}
