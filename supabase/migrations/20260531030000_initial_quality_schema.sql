create extension if not exists pgcrypto;

create type public.member_role as enum (
  'owner',
  'admin',
  'team_lead',
  'cleaner'
);

create type public.control_status as enum (
  'draft',
  'completed',
  'canceled'
);

create type public.checklist_result_status as enum (
  'compliant',
  'non_compliant',
  'not_applicable'
);

create type public.corrective_action_status as enum (
  'open',
  'in_progress',
  'done',
  'canceled'
);

create type public.priority_level as enum (
  'low',
  'normal',
  'high'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'cleaner',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.buildings (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 160),
  address text check (address is null or char_length(address) <= 240),
  access_notes text check (access_notes is null or char_length(access_notes) <= 1000),
  priority_score smallint not null default 0 check (priority_score between 0 and 100),
  last_control_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, organization_id)
);

create table public.checklist_items (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  label text not null check (char_length(label) between 1 and 180),
  description text check (description is null or char_length(description) <= 1000),
  position integer not null check (position >= 0),
  is_required boolean not null default true,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, organization_id)
);

create table public.controls (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  building_id uuid not null,
  controlled_by uuid not null references auth.users(id) on delete restrict,
  status public.control_status not null default 'draft',
  started_at timestamptz not null,
  completed_at timestamptz,
  general_comment text check (general_comment is null or char_length(general_comment) <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, organization_id),
  constraint controls_building_same_org
    foreign key (building_id, organization_id)
    references public.buildings(id, organization_id)
    on delete restrict,
  constraint controls_completed_at_required
    check (status <> 'completed' or completed_at is not null)
);

create table public.control_checklist_results (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  control_id uuid not null,
  checklist_item_id uuid not null,
  status public.checklist_result_status not null,
  comment text check (comment is null or char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (control_id, checklist_item_id),
  constraint checklist_results_control_same_org
    foreign key (control_id, organization_id)
    references public.controls(id, organization_id)
    on delete cascade,
  constraint checklist_results_item_same_org
    foreign key (checklist_item_id, organization_id)
    references public.checklist_items(id, organization_id)
    on delete restrict
);

create table public.corrective_actions (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  building_id uuid not null,
  control_id uuid,
  title text not null check (char_length(title) between 1 and 180),
  description text check (description is null or char_length(description) <= 2000),
  priority public.priority_level not null default 'normal',
  status public.corrective_action_status not null default 'open',
  due_date date,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint corrective_actions_building_same_org
    foreign key (building_id, organization_id)
    references public.buildings(id, organization_id)
    on delete restrict,
  constraint corrective_actions_control_same_org
    foreign key (control_id, organization_id)
    references public.controls(id, organization_id)
    on delete set null,
  constraint corrective_actions_resolved_when_done
    check (status <> 'done' or resolved_at is not null)
);

create index organizations_name_idx on public.organizations (name);
create index organization_members_user_idx on public.organization_members (user_id);
create index buildings_priority_idx on public.buildings (organization_id, deleted_at, priority_score desc, name);
create index checklist_items_position_idx on public.checklist_items (organization_id, deleted_at, is_active, position);
create index controls_building_idx on public.controls (organization_id, building_id, started_at desc);
create index controls_status_idx on public.controls (organization_id, deleted_at, status, started_at desc);
create index checklist_results_control_idx on public.control_checklist_results (organization_id, control_id);
create index corrective_actions_status_idx on public.corrective_actions (organization_id, deleted_at, status, priority, due_date);
create index corrective_actions_assignee_idx on public.corrective_actions (organization_id, assigned_to, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger buildings_set_updated_at
before update on public.buildings
for each row execute function public.set_updated_at();

create trigger checklist_items_set_updated_at
before update on public.checklist_items
for each row execute function public.set_updated_at();

create trigger controls_set_updated_at
before update on public.controls
for each row execute function public.set_updated_at();

create trigger checklist_results_set_updated_at
before update on public.control_checklist_results
for each row execute function public.set_updated_at();

create trigger corrective_actions_set_updated_at
before update on public.corrective_actions
for each row execute function public.set_updated_at();

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_org_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = (select auth.uid())
      and role in ('owner', 'admin')
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.is_org_admin(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.buildings enable row level security;
alter table public.checklist_items enable row level security;
alter table public.controls enable row level security;
alter table public.control_checklist_results enable row level security;
alter table public.corrective_actions enable row level security;

alter table public.organizations force row level security;
alter table public.organization_members force row level security;
alter table public.buildings force row level security;
alter table public.checklist_items force row level security;
alter table public.controls force row level security;
alter table public.control_checklist_results force row level security;
alter table public.corrective_actions force row level security;

grant usage on schema public to authenticated;
grant select, update on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select, insert, update on public.buildings to authenticated;
grant select, insert, update on public.checklist_items to authenticated;
grant select, insert, update on public.controls to authenticated;
grant select, insert, update on public.control_checklist_results to authenticated;
grant select, insert, update on public.corrective_actions to authenticated;

create policy "Organizations are visible to members"
on public.organizations
for select
to authenticated
using ((select auth.uid()) is not null and public.is_org_member(id));

create policy "Organization admins can update organizations"
on public.organizations
for update
to authenticated
using ((select auth.uid()) is not null and public.is_org_admin(id))
with check ((select auth.uid()) is not null and public.is_org_admin(id));

create policy "Organization members are visible to members"
on public.organization_members
for select
to authenticated
using ((select auth.uid()) is not null and public.is_org_member(organization_id));

create policy "Organization admins can add members"
on public.organization_members
for insert
to authenticated
with check ((select auth.uid()) is not null and public.is_org_admin(organization_id));

create policy "Organization admins can update members"
on public.organization_members
for update
to authenticated
using ((select auth.uid()) is not null and public.is_org_admin(organization_id))
with check ((select auth.uid()) is not null and public.is_org_admin(organization_id));

create policy "Organization admins can remove members"
on public.organization_members
for delete
to authenticated
using ((select auth.uid()) is not null and public.is_org_admin(organization_id));

create policy "Buildings are visible to organization members"
on public.buildings
for select
to authenticated
using ((select auth.uid()) is not null and public.is_org_member(organization_id));

create policy "Organization members can create buildings"
on public.buildings
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and public.is_org_member(organization_id)
  and created_by = (select auth.uid())
);

create policy "Organization members can update buildings"
on public.buildings
for update
to authenticated
using ((select auth.uid()) is not null and public.is_org_member(organization_id))
with check ((select auth.uid()) is not null and public.is_org_member(organization_id));

create policy "Checklist items are visible to organization members"
on public.checklist_items
for select
to authenticated
using ((select auth.uid()) is not null and public.is_org_member(organization_id));

create policy "Organization members can create checklist items"
on public.checklist_items
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and public.is_org_member(organization_id)
  and created_by = (select auth.uid())
);

create policy "Organization members can update checklist items"
on public.checklist_items
for update
to authenticated
using ((select auth.uid()) is not null and public.is_org_member(organization_id))
with check ((select auth.uid()) is not null and public.is_org_member(organization_id));

create policy "Controls are visible to organization members"
on public.controls
for select
to authenticated
using ((select auth.uid()) is not null and public.is_org_member(organization_id));

create policy "Organization members can create controls"
on public.controls
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and public.is_org_member(organization_id)
  and controlled_by = (select auth.uid())
);

create policy "Organization members can update controls"
on public.controls
for update
to authenticated
using ((select auth.uid()) is not null and public.is_org_member(organization_id))
with check ((select auth.uid()) is not null and public.is_org_member(organization_id));

create policy "Checklist results are visible to organization members"
on public.control_checklist_results
for select
to authenticated
using ((select auth.uid()) is not null and public.is_org_member(organization_id));

create policy "Organization members can create checklist results"
on public.control_checklist_results
for insert
to authenticated
with check ((select auth.uid()) is not null and public.is_org_member(organization_id));

create policy "Organization members can update checklist results"
on public.control_checklist_results
for update
to authenticated
using ((select auth.uid()) is not null and public.is_org_member(organization_id))
with check ((select auth.uid()) is not null and public.is_org_member(organization_id));

create policy "Corrective actions are visible to organization members"
on public.corrective_actions
for select
to authenticated
using ((select auth.uid()) is not null and public.is_org_member(organization_id));

create policy "Organization members can create corrective actions"
on public.corrective_actions
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and public.is_org_member(organization_id)
  and created_by = (select auth.uid())
);

create policy "Organization members can update corrective actions"
on public.corrective_actions
for update
to authenticated
using ((select auth.uid()) is not null and public.is_org_member(organization_id))
with check ((select auth.uid()) is not null and public.is_org_member(organization_id));
