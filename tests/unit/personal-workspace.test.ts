import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BatimentControlDatabase } from "@/lib/db/schema";
import { createEmptyRemoteSnapshot } from "@/lib/sync/remote-snapshot";
import {
  listPersonalOrganizationsForUser,
  preparePersonalWorkspaceForUser,
} from "@/features/buildings/services/personal-workspace";
import type { Organization, OrganizationMember } from "@/types/domain";

const now = "2026-06-04T00:00:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";

function createTestDatabase() {
  return new BatimentControlDatabase(
    `batiment-control-personal-workspace-test-${Date.now()}-${Math.random()}`,
  );
}

function createPersonalOrganization(
  overrides: Partial<Organization> = {},
): Organization {
  return {
    createdAt: now,
    id: organizationId,
    name: "Mon espace",
    ownerId: userId,
    updatedAt: now,
    workspaceType: "personal",
    ...overrides,
  };
}

function createMembership(
  overrides: Partial<OrganizationMember> = {},
): OrganizationMember {
  return {
    createdAt: now,
    organizationId,
    role: "owner",
    userId,
    ...overrides,
  };
}

describe("personal workspace service", () => {
  let database: BatimentControlDatabase;

  beforeEach(() => {
    database = createTestDatabase();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("lists an existing local personal workspace", async () => {
    const organization = createPersonalOrganization();

    await database.organizations.put(organization);
    await database.organizationMembers.put(createMembership());

    await expect(
      listPersonalOrganizationsForUser({ database, userId }),
    ).resolves.toEqual([organization]);
  });

  it("pulls and saves the personal workspace when local storage is empty", async () => {
    const organization = createPersonalOrganization();
    const membership = createMembership();

    await expect(
      preparePersonalWorkspaceForUser({
        database,
        isOnline: () => true,
        remote: {
          async pullForUser() {
            return {
              ...createEmptyRemoteSnapshot(),
              organizationMembers: [membership],
              organizations: [organization],
            };
          },
        },
        userId,
      }),
    ).resolves.toEqual([organization]);

    await expect(database.organizations.get(organizationId)).resolves.toEqual(
      organization,
    );
    await expect(
      database.organizationMembers.get([organizationId, userId]),
    ).resolves.toEqual(membership);
  });

  it("keeps first workspace preparation online-only", async () => {
    await expect(
      preparePersonalWorkspaceForUser({
        database,
        isOnline: () => false,
        remote: {
          async pullForUser() {
            throw new Error("Unexpected remote call");
          },
        },
        userId,
      }),
    ).rejects.toThrow("Connexion requise");
  });
});
