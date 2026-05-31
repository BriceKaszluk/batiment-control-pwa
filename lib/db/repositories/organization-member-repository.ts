import type { Table } from "dexie";

import { organizationMemberSchema } from "@/lib/validation/schemas";
import type { OrganizationMember } from "@/types/domain";

export type OrganizationMemberKey = [organizationId: string, userId: string];

export type OrganizationMemberRepository = {
  bulkSaveSynced(records: readonly OrganizationMember[]): Promise<OrganizationMemberKey[]>;
  getByKey(key: OrganizationMemberKey): Promise<OrganizationMember | undefined>;
  listByOrganization(organizationId: string): Promise<OrganizationMember[]>;
  saveSynced(record: OrganizationMember): Promise<OrganizationMemberKey>;
};

export function createOrganizationMemberRepository(
  table: Table<OrganizationMember, OrganizationMemberKey>,
): OrganizationMemberRepository {
  return {
    async bulkSaveSynced(records) {
      const parsedRecords = records.map((record) =>
        organizationMemberSchema.parse(record),
      );

      await table.bulkPut(parsedRecords);

      return parsedRecords.map((record) => [
        record.organizationId,
        record.userId,
      ]);
    },

    async getByKey(key) {
      return table.get(key);
    },

    async listByOrganization(organizationId) {
      return table.where("organizationId").equals(organizationId).toArray();
    },

    async saveSynced(record) {
      const parsedRecord = organizationMemberSchema.parse(record);

      await table.put(parsedRecord);

      return [parsedRecord.organizationId, parsedRecord.userId];
    },
  };
}
