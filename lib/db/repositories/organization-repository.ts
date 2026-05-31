import type { Table } from "dexie";

import { organizationSchema } from "@/lib/validation/schemas";
import type { Organization } from "@/types/domain";

export type OrganizationRepository = {
  bulkSaveSynced(records: readonly Organization[]): Promise<string[]>;
  getById(id: string): Promise<Organization | undefined>;
  listAll(): Promise<Organization[]>;
  saveSynced(record: Organization): Promise<string>;
};

export function createOrganizationRepository(
  table: Table<Organization, string>,
): OrganizationRepository {
  return {
    async bulkSaveSynced(records) {
      const parsedRecords = records.map((record) => organizationSchema.parse(record));

      await table.bulkPut(parsedRecords);

      return parsedRecords.map((record) => record.id);
    },

    async getById(id) {
      return table.get(id);
    },

    async listAll() {
      return table.orderBy("name").toArray();
    },

    async saveSynced(record) {
      const parsedRecord = organizationSchema.parse(record);

      await table.put(parsedRecord);

      return parsedRecord.id;
    },
  };
}
