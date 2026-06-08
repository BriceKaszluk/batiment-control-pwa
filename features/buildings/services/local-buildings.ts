"use client";

import type { BatimentControlDatabase } from "@/lib/db/schema";
import { db } from "@/lib/db/dexie";
import {
  calculateBuildingPriorityScore,
  type BuildingPriorityScore,
} from "@/features/buildings/services/building-priority-score";
import type {
  Agent,
  Building,
  ControlAreaResult,
  ChecklistResult,
  Control,
  Organization,
} from "@/types/domain";

export {
  getBuildingPriorityLabel,
  getBuildingPriorityTone,
  type BuildingPriorityTone,
} from "@/features/buildings/services/building-labels";

export type ListBuildingsForUserOptions = {
  database?: BatimentControlDatabase;
  limit?: number;
  now?: () => string;
  searchQuery?: string | null;
  sectorName?: string | null;
  userId: string | null;
};

export type BuildingListEntry = {
  agent: Agent | null;
  building: Building;
  priorityScore: BuildingPriorityScore;
  recentCompletedControls: Control[];
};

export async function listBuildingsForUser({
  database = db,
  limit,
  now,
  searchQuery,
  sectorName,
  userId,
}: ListBuildingsForUserOptions): Promise<Building[]> {
  const entries = await listBuildingEntriesForUser({
    database,
    limit,
    now,
    searchQuery,
    sectorName,
    userId,
  });

  return entries.map((entry) => entry.building);
}

export async function listBuildingEntriesForUser({
  database = db,
  limit,
  now = () => new Date().toISOString(),
  searchQuery,
  sectorName,
  userId,
}: ListBuildingsForUserOptions): Promise<BuildingListEntry[]> {
  if (!userId) {
    return [];
  }

  const buildings = await listVisibleBuildingsForUser({
    database,
    sectorName,
    userId,
  });
  const [agentsById, scoreContextsByBuildingId] = await Promise.all([
    getAgentsById({ buildings, database }),
    getScoreContextsByBuildingId({ buildings, database }),
  ]);
  const scoredEntries = buildings.map((building) => ({
    agent: building.assignedAgentId
      ? agentsById.get(building.assignedAgentId) ?? null
      : null,
    building,
    priorityScore: calculateBuildingPriorityScore({
      building,
      now: now(),
      ...scoreContextsByBuildingId.get(building.id),
    }),
    recentCompletedControls:
      scoreContextsByBuildingId.get(building.id)?.recentCompletedControls ?? [],
  }));
  const matchingEntries = filterBuildingEntriesBySearchQuery({
    entries: scoredEntries,
    searchQuery,
  });
  const sortedEntries = matchingEntries.sort(compareBuildingEntriesByPriorityScore);

  return typeof limit === "number" ? sortedEntries.slice(0, limit) : sortedEntries;
}

async function listVisibleBuildingsForUser({
  database,
  sectorName,
  userId,
}: {
  database: BatimentControlDatabase;
  sectorName?: string | null;
  userId: string;
}) {
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

  const organizations = await database.organizations.bulkGet(organizationIds);
  const personalOrganizationIds = organizations
    .filter(
      (organization): organization is Organization =>
        organization !== undefined &&
        organization.ownerId === userId &&
        organization.workspaceType === "personal",
    )
    .map((organization) => organization.id);
  const visibleOrganizationIds =
    personalOrganizationIds.length > 0 ? personalOrganizationIds : organizationIds;

  const buildings = await database.buildings
    .where("organizationId")
    .anyOf(visibleOrganizationIds)
    .filter(
      (building) =>
        building.deletedAt === null &&
        (!sectorName || normalizeSectorName(building.sector) === normalizeSectorName(sectorName)),
    )
    .toArray();

  return buildings;
}

async function getAgentsById({
  buildings,
  database,
}: {
  buildings: Building[];
  database: BatimentControlDatabase;
}) {
  const agentIds = [
    ...new Set(
      buildings
        .map((building) => building.assignedAgentId)
        .filter((agentId): agentId is string => Boolean(agentId)),
    ),
  ];

  if (agentIds.length === 0) {
    return new Map<string, Agent>();
  }

  const agents = await database.agents.bulkGet(agentIds);
  return new Map(
    agents
      .filter(
        (agent): agent is Agent =>
          agent !== undefined && agent.deletedAt === null,
      )
      .map((agent) => [agent.id, agent]),
  );
}

type BuildingScoreContext = {
  latestAreaResults: ControlAreaResult[];
  latestChecklistResults: ChecklistResult[];
  latestCompletedControl: Control | null;
  recentCompletedControls: Control[];
};

async function getScoreContextsByBuildingId({
  buildings,
  database,
}: {
  buildings: Building[];
  database: BatimentControlDatabase;
}) {
  const buildingIds = buildings.map((building) => building.id);
  const contextByBuildingId = new Map<string, BuildingScoreContext>(
    buildingIds.map((buildingId) => [
      buildingId,
      {
        latestAreaResults: [],
        latestChecklistResults: [],
        latestCompletedControl: null,
        recentCompletedControls: [],
      },
    ]),
  );

  if (buildingIds.length === 0) {
    return contextByBuildingId;
  }

  const controls = await database.controls
    .where("buildingId")
    .anyOf(buildingIds)
    .filter(
      (control) =>
        control.deletedAt === null &&
        control.status === "completed" &&
        control.completedAt !== null,
    )
    .toArray();
  const controlsByBuildingId = new Map<string, Control[]>();

  for (const control of controls) {
    const existingControls = controlsByBuildingId.get(control.buildingId) ?? [];
    existingControls.push(control);
    controlsByBuildingId.set(control.buildingId, existingControls);
  }

  for (const [buildingId, buildingControls] of controlsByBuildingId) {
    const context = contextByBuildingId.get(buildingId);
    const sortedControls = buildingControls.sort(compareControlsByCompletedAt);

    if (context) {
      context.latestCompletedControl = sortedControls[0] ?? null;
      context.recentCompletedControls = sortedControls.slice(0, 3);
    }
  }

  const latestCompletedControls = [...contextByBuildingId.values()]
    .map((context) => context.latestCompletedControl)
    .filter((control): control is Control => control !== null);
  const latestControlIds = latestCompletedControls.map((control) => control.id);
  const checklistResults =
    latestControlIds.length > 0
      ? await database.checklistResults
          .where("controlId")
          .anyOf(latestControlIds)
          .toArray()
      : [];
  const areaResults =
    latestControlIds.length > 0
      ? await database.controlAreaResults
          .where("controlId")
          .anyOf(latestControlIds)
          .toArray()
      : [];

  for (const control of latestCompletedControls) {
    const context = contextByBuildingId.get(control.buildingId);

    if (context) {
      context.latestAreaResults = areaResults.filter(
        (result) => result.controlId === control.id,
      );
      context.latestChecklistResults = checklistResults.filter(
        (result) => result.controlId === control.id,
      );
    }
  }

  return contextByBuildingId;
}

function compareControlsByCompletedAt(
  firstControl: Control,
  secondControl: Control,
) {
  return (
    Date.parse(secondControl.completedAt ?? secondControl.startedAt) -
    Date.parse(firstControl.completedAt ?? firstControl.startedAt)
  );
}

export function compareBuildingEntriesByPriorityScore(
  firstEntry: BuildingListEntry,
  secondEntry: BuildingListEntry,
) {
  const scoreDifference =
    secondEntry.priorityScore.score - firstEntry.priorityScore.score;

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  return firstEntry.building.name.localeCompare(secondEntry.building.name, "fr");
}

function normalizeSectorName(sectorName: string) {
  return sectorName.trim().toLocaleLowerCase("fr");
}

export function filterBuildingEntriesBySearchQuery({
  entries,
  searchQuery,
}: {
  entries: BuildingListEntry[];
  searchQuery?: string | null;
}) {
  const normalizedQuery = normalizeSearchText(searchQuery ?? "");

  if (!normalizedQuery) {
    return entries;
  }

  return entries.filter((entry) =>
    getBuildingSearchContent(entry).includes(normalizedQuery),
  );
}

function getBuildingSearchContent({ agent, building }: BuildingListEntry) {
  return normalizeSearchText(
    [
      building.name,
      building.address,
      building.sector,
      building.internalNotes,
      agent?.name,
      building.assignedAgentName,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" "),
  );
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLocaleLowerCase("fr");
}
