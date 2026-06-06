create table public.building_sectors (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 160),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, organization_id)
);

create index building_sectors_organization_idx
on public.building_sectors (organization_id, deleted_at, name);

create trigger building_sectors_set_updated_at
before update on public.building_sectors
for each row execute function public.set_updated_at();

alter table public.building_sectors enable row level security;
alter table public.building_sectors force row level security;

grant select, insert, update on public.building_sectors to authenticated;

create policy "Building sectors are visible to organization members"
on public.building_sectors
for select
to authenticated
using ((select auth.uid()) is not null and public.is_org_member(organization_id));

create policy "Organization members can create building sectors"
on public.building_sectors
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and public.is_org_member(organization_id)
  and created_by = (select auth.uid())
);

create policy "Organization members can update building sectors"
on public.building_sectors
for update
to authenticated
using ((select auth.uid()) is not null and public.is_org_member(organization_id))
with check ((select auth.uid()) is not null and public.is_org_member(organization_id));
