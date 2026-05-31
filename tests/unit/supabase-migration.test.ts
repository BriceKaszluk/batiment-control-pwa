import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260531030000_initial_quality_schema.sql",
  "utf8",
);

const publicTables = [
  "organizations",
  "organization_members",
  "buildings",
  "checklist_items",
  "controls",
  "control_checklist_results",
  "corrective_actions",
] as const;

describe("initial Supabase migration", () => {
  it("enables and forces RLS on every exposed public table", () => {
    publicTables.forEach((table) => {
      expect(migration).toContain(
        `alter table public.${table} enable row level security;`,
      );
      expect(migration).toContain(
        `alter table public.${table} force row level security;`,
      );
    });
  });

  it("creates at least one authenticated policy for every public table", () => {
    publicTables.forEach((table) => {
      expect(migration).toMatch(
        new RegExp(
          `create policy "[^"]+"\\s+on public\\.${table}\\s+[\\s\\S]+?to authenticated`,
          "i",
        ),
      );
    });
  });

  it("does not grant client access to the service role", () => {
    expect(migration.toLowerCase()).not.toContain("service_role");
  });

  it("uses auth.uid checks in RLS policies", () => {
    expect(migration).toContain("(select auth.uid()) is not null");
    expect(migration).toContain("created_by = (select auth.uid())");
    expect(migration).toContain("controlled_by = (select auth.uid())");
  });
});
