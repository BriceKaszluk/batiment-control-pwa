import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260531030000_initial_quality_schema.sql",
  "utf8",
);
const personalWorkspaceMigration = readFileSync(
  "supabase/migrations/20260603225500_add_personal_workspaces.sql",
  "utf8",
);
const personalWorkspaceRpcFixMigration = readFileSync(
  "supabase/migrations/20260603231500_fix_personal_workspace_rpc.sql",
  "utf8",
);
const personalWorkspaceRpcAmbiguityFixMigration = readFileSync(
  "supabase/migrations/20260604000000_fix_personal_workspace_rpc_ambiguity.sql",
  "utf8",
);
const agentsMigration = readFileSync(
  "supabase/migrations/20260606100000_add_agents.sql",
  "utf8",
);
const buildingSectorsMigration = readFileSync(
  "supabase/migrations/20260606110000_add_building_sectors.sql",
  "utf8",
);
const controlQualityRatingMigration = readFileSync(
  "supabase/migrations/20260606120000_add_control_quality_rating.sql",
  "utf8",
);
const controlLifecycleMigration = readFileSync(
  "supabase/migrations/20260606130000_add_control_lifecycle.sql",
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
  "control_photos",
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

  it("defines a private storage bucket and policies for control photos", () => {
    expect(migration).toContain("insert into storage.buckets");
    expect(migration).toContain("'control-photos'");
    expect(migration).toContain("on storage.objects");
    expect(migration).toContain("bucket_id = 'control-photos'");
    expect(migration).toContain("file_size_limit");
    expect(migration).toContain("allowed_mime_types");
  });
});

describe("personal workspace Supabase migration", () => {
  it("creates an authenticated RPC for idempotent personal workspaces", () => {
    expect(personalWorkspaceMigration).toContain(
      "create or replace function public.ensure_personal_workspace",
    );
    expect(personalWorkspaceMigration).toContain("security definer");
    expect(personalWorkspaceMigration).toContain("(select auth.uid())");
    expect(personalWorkspaceMigration).toContain(
      "grant execute on function public.ensure_personal_workspace(text) to authenticated;",
    );
    expect(personalWorkspaceMigration).not.toContain("service_role");
  });

  it("qualifies timestamp columns in the corrective workspace RPC", () => {
    expect(personalWorkspaceRpcFixMigration).toContain(
      "order by organizations.created_at",
    );
    expect(personalWorkspaceRpcFixMigration).toContain(
      "personal_workspace.created_at",
    );
    expect(personalWorkspaceRpcFixMigration).toContain(
      "grant execute on function public.ensure_personal_workspace(text) to authenticated;",
    );
    expect(personalWorkspaceRpcFixMigration).not.toContain("service_role");
  });

  it("removes ambiguous column references in the final workspace RPC", () => {
    expect(personalWorkspaceRpcAmbiguityFixMigration).toContain(
      "from public.organizations as org",
    );
    expect(personalWorkspaceRpcAmbiguityFixMigration).toContain(
      "on conflict on constraint organization_members_pkey",
    );
    expect(personalWorkspaceRpcAmbiguityFixMigration).toContain(
      "org.id as organization_id",
    );
    expect(personalWorkspaceRpcAmbiguityFixMigration).toContain(
      "org.name as organization_name",
    );
    expect(personalWorkspaceRpcAmbiguityFixMigration).toContain(
      "grant execute on function public.ensure_personal_workspace(text) to authenticated;",
    );
    expect(personalWorkspaceRpcAmbiguityFixMigration).not.toContain(
      "service_role",
    );
  });
});

describe("agents Supabase migration", () => {
  it("creates the agents table and links buildings by agent id", () => {
    expect(agentsMigration).toContain("create table public.agents");
    expect(agentsMigration).toContain("status public.agent_status");
    expect(agentsMigration).toContain("created_by uuid not null");
    expect(agentsMigration).toContain("add column assigned_agent_id uuid");
    expect(agentsMigration).toContain("constraint buildings_agent_same_org");
  });

  it("enables forced RLS and authenticated policies for agents", () => {
    expect(agentsMigration).toContain(
      "alter table public.agents enable row level security;",
    );
    expect(agentsMigration).toContain(
      "alter table public.agents force row level security;",
    );
    expect(agentsMigration).toMatch(
      /create policy "[^"]+"\s+on public\.agents\s+[\s\S]+?to authenticated/i,
    );
    expect(agentsMigration).toContain("created_by = (select auth.uid())");
    expect(agentsMigration).not.toContain("service_role");
  });
});

describe("building sectors Supabase migration", () => {
  it("creates the building sectors table", () => {
    expect(buildingSectorsMigration).toContain(
      "create table public.building_sectors",
    );
    expect(buildingSectorsMigration).toContain("name text not null");
    expect(buildingSectorsMigration).toContain("created_by uuid not null");
    expect(buildingSectorsMigration).not.toContain("service_role");
  });

  it("enables forced RLS and authenticated policies for building sectors", () => {
    expect(buildingSectorsMigration).toContain(
      "alter table public.building_sectors enable row level security;",
    );
    expect(buildingSectorsMigration).toContain(
      "alter table public.building_sectors force row level security;",
    );
    expect(buildingSectorsMigration).toMatch(
      /create policy "[^"]+"\s+on public\.building_sectors\s+[\s\S]+?to authenticated/i,
    );
    expect(buildingSectorsMigration).toContain(
      "created_by = (select auth.uid())",
    );
  });
});

describe("control quality rating Supabase migration", () => {
  it("adds a nullable quality rating enum to controls", () => {
    expect(controlQualityRatingMigration).toContain(
      "create type public.control_quality_rating as enum",
    );
    expect(controlQualityRatingMigration).toContain("'satisfying'");
    expect(controlQualityRatingMigration).toContain("'acceptable'");
    expect(controlQualityRatingMigration).toContain("'to_improve'");
    expect(controlQualityRatingMigration).toContain("'unsatisfying'");
    expect(controlQualityRatingMigration).toContain(
      "add column if not exists quality_rating public.control_quality_rating",
    );
    expect(controlQualityRatingMigration).not.toContain("service_role");
  });
});

describe("control lifecycle Supabase migration", () => {
  it("adds lifecycle columns and a lightweight summary table", () => {
    expect(controlLifecycleMigration).toContain("archived_at timestamptz");
    expect(controlLifecycleMigration).toContain("photos_purged_at timestamptz");
    expect(controlLifecycleMigration).toContain("details_purged_at timestamptz");
    expect(controlLifecycleMigration).toContain(
      "create table public.control_summaries",
    );
    expect(controlLifecycleMigration).toContain("photo_count integer not null");
    expect(controlLifecycleMigration).not.toContain("service_role");
  });

  it("protects summaries with RLS and allows storage photo deletion", () => {
    expect(controlLifecycleMigration).toContain(
      "alter table public.control_summaries enable row level security;",
    );
    expect(controlLifecycleMigration).toContain(
      "alter table public.control_summaries force row level security;",
    );
    expect(controlLifecycleMigration).toMatch(
      /create policy "[^"]+"\s+on public\.control_summaries\s+[\s\S]+?to authenticated/i,
    );
    expect(controlLifecycleMigration).toContain(
      "on storage.objects\nfor delete",
    );
    expect(controlLifecycleMigration).toContain("bucket_id = 'control-photos'");
  });
});
