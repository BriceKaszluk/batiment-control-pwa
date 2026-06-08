import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createAgent,
  listAgentsForUser,
  updateAgent,
} from "@/features/agents/services/local-agents";
import { BatimentControlDatabase } from "@/lib/db/schema";
import type { Organization, OrganizationMember } from "@/types/domain";

const now = "2026-05-31T00:00:00.000Z";
const later = "2026-05-31T01:00:00.000Z";
const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const agentId = "33333333-3333-4333-8333-333333333333";
const mutationId = "44444444-4444-4444-8444-444444444444";
const operationId = "55555555-5555-4555-8555-555555555555";
const secondMutationId = "66666666-6666-4666-8666-666666666666";
const secondOperationId = "77777777-7777-4777-8777-777777777777";

function createTestDatabase() {
  return new BatimentControlDatabase(
    `batiment-control-local-agents-test-${Date.now()}-${Math.random()}`,
  );
}

function createIdFactory(ids: readonly string[]) {
  let index = 0;

  return () => {
    const id = ids[index];
    index += 1;

    if (!id) {
      throw new Error("No test id available.");
    }

    return id;
  };
}

const organization: Organization = {
  createdAt: now,
  id: organizationId,
  name: "Mon espace",
  ownerId: userId,
  updatedAt: now,
  workspaceType: "personal",
};

const organizationMember: OrganizationMember = {
  createdAt: now,
  organizationId,
  role: "team_lead",
  userId,
};

describe("local agents", () => {
  let database: BatimentControlDatabase;

  beforeEach(async () => {
    database = createTestDatabase();
    await database.organizations.put(organization);
    await database.organizationMembers.put(organizationMember);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("creates an agent locally and enqueues an outbox operation", async () => {
    const result = await createAgent({
      createId: createIdFactory([agentId, mutationId, operationId]),
      database,
      input: {
        name: "agent a",
        status: "present",
      },
      now: () => now,
      organizationId,
      userId,
    });

    expect(result.record).toMatchObject({
      createdAt: now,
      createdBy: userId,
      id: agentId,
      name: "Agent A",
      organizationId,
      status: "present",
      updatedAt: now,
    });
    await expect(database.agents.get(agentId)).resolves.toEqual(result.record);
    await expect(database.outbox.get(operationId)).resolves.toMatchObject({
      aggregateId: agentId,
      entity: "agents",
      organizationId,
      status: "pending",
    });
  });

  it("updates an agent status locally and lists the latest version", async () => {
    await createAgent({
      createId: createIdFactory([agentId, mutationId, operationId]),
      database,
      input: {
        name: "agent a",
        status: "present",
      },
      now: () => now,
      organizationId,
      userId,
    });

    const result = await updateAgent({
      agentId,
      createId: createIdFactory([secondMutationId, secondOperationId]),
      database,
      input: {
        name: "agent malade",
        status: "sick_leave",
      },
      now: () => later,
      userId,
    });

    expect(result.record).toMatchObject({
      id: agentId,
      name: "Agent Malade",
      status: "sick_leave",
      updatedAt: later,
    });
    await expect(listAgentsForUser({ database, userId })).resolves.toEqual([
      result.record,
    ]);
    await expect(database.outbox.get(secondOperationId)).resolves.toMatchObject({
      aggregateId: agentId,
      entity: "agents",
      status: "pending",
    });
  });
});
