"use client";

import type { BatimentControlDatabase } from "@/lib/db/schema";
import { db } from "@/lib/db/dexie";
import { listPersonalOrganizationsForUser } from "@/features/buildings/services/personal-workspace";
import type { Control } from "@/types/domain";

export type LocalDiagnostics = {
  agentCount: number;
  buildingCount: number;
  draftControlCount: number;
  historyControlCount: number;
  sectorCount: number;
  todayControlCount: number;
};

export type GetLocalDiagnosticsOptions = {
  database?: BatimentControlDatabase;
  now?: () => string;
  userId: string | null;
};

export async function getLocalDiagnostics({
  database = db,
  now = () => new Date().toISOString(),
  userId,
}: GetLocalDiagnosticsOptions): Promise<LocalDiagnostics> {
  if (!userId) {
    return createEmptyDiagnostics();
  }

  const organizations = await listPersonalOrganizationsForUser({
    database,
    userId,
  });
  const organizationIds = organizations.map((organization) => organization.id);

  if (organizationIds.length === 0) {
    return createEmptyDiagnostics();
  }

  const [agents, buildings, controls, sectors] = await Promise.all([
    database.agents
      .where("organizationId")
      .anyOf(organizationIds)
      .filter((agent) => agent.deletedAt === null)
      .toArray(),
    database.buildings
      .where("organizationId")
      .anyOf(organizationIds)
      .filter((building) => building.deletedAt === null)
      .toArray(),
    database.controls
      .where("organizationId")
      .anyOf(organizationIds)
      .filter((control) => control.deletedAt === null)
      .toArray(),
    database.buildingSectors
      .where("organizationId")
      .anyOf(organizationIds)
      .filter((sector) => sector.deletedAt === null)
      .toArray(),
  ]);

  return {
    agentCount: agents.length,
    buildingCount: buildings.length,
    draftControlCount: controls.filter((control) => control.status === "draft")
      .length,
    historyControlCount: controls.filter((control) =>
      isVisibleHistoryControl(control, now()),
    ).length,
    sectorCount: sectors.length,
    todayControlCount: controls.filter((control) => isCompletedToday(control, now()))
      .length,
  };
}

function isCompletedToday(control: Control, now: string) {
  if (control.status !== "completed" || !control.completedAt) {
    return false;
  }

  const { endOfDayMs, startOfDayMs } = getLocalDayBounds(now);
  const completedAtMs = Date.parse(control.completedAt);

  return completedAtMs >= startOfDayMs && completedAtMs < endOfDayMs;
}

function isVisibleHistoryControl(control: Control, now: string) {
  return (
    control.archivedAt === null &&
    control.status === "completed" &&
    !isCompletedToday(control, now)
  );
}

function getLocalDayBounds(value: string) {
  const date = new Date(value);
  const startOfDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  return {
    endOfDayMs: startOfDay.getTime() + 86_400_000,
    startOfDayMs: startOfDay.getTime(),
  };
}

function createEmptyDiagnostics(): LocalDiagnostics {
  return {
    agentCount: 0,
    buildingCount: 0,
    draftControlCount: 0,
    historyControlCount: 0,
    sectorCount: 0,
    todayControlCount: 0,
  };
}
