create table public.agents (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 160),
  status public.agent_status not null default 'unknown',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, organization_id)
);

alter table public.buildings
  add column assigned_agent_id uuid,
  add constraint buildings_agent_same_org
    foreign key (assigned_agent_id, organization_id)
    references public.agents(id, organization_id)
    on delete restrict;

create index agents_organization_idx
on public.agents (organization_id, deleted_at, name);

create index agents_status_idx
on public.agents (organization_id, status, deleted_at);

create index buildings_assigned_agent_idx
on public.buildings (organization_id, assigned_agent_id)
where assigned_agent_id is not null;

create trigger agents_set_updated_at
before update on public.agents
for each row execute function public.set_updated_at();

alter table public.agents enable row level security;
alter table public.agents force row level security;

grant select, insert, update on public.agents to authenticated;

create policy "Agents are visible to organization members"
on public.agents
for select
to authenticated
using ((select auth.uid()) is not null and public.is_org_member(organization_id));

create policy "Organization members can create agents"
on public.agents
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and public.is_org_member(organization_id)
  and created_by = (select auth.uid())
);

create policy "Organization members can update agents"
on public.agents
for update
to authenticated
using ((select auth.uid()) is not null and public.is_org_member(organization_id))
with check ((select auth.uid()) is not null and public.is_org_member(organization_id));
