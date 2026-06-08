create type public.control_area_result_status as enum (
  'satisfying',
  'unsatisfying'
);

create table public.control_area_results (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  control_id uuid not null,
  area text not null check (
    area in (
      'outdoor',
      'hall',
      'elevator',
      'stairs',
      'floor_landings',
      'basement_access',
      'common_areas',
      'garage'
    )
  ),
  status public.control_area_result_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (control_id, area),
  constraint control_area_results_control_same_org
    foreign key (control_id, organization_id)
    references public.controls(id, organization_id)
    on delete cascade
);

create index control_area_results_control_idx
on public.control_area_results (organization_id, control_id);

create trigger control_area_results_set_updated_at
before update on public.control_area_results
for each row execute function public.set_updated_at();

alter table public.control_area_results enable row level security;
alter table public.control_area_results force row level security;

grant select, insert, update on public.control_area_results to authenticated;

create policy "Control area results are visible to organization members"
on public.control_area_results
for select
to authenticated
using ((select auth.uid()) is not null and public.is_org_member(organization_id));

create policy "Organization members can create control area results"
on public.control_area_results
for insert
to authenticated
with check ((select auth.uid()) is not null and public.is_org_member(organization_id));

create policy "Organization members can update control area results"
on public.control_area_results
for update
to authenticated
using ((select auth.uid()) is not null and public.is_org_member(organization_id))
with check ((select auth.uid()) is not null and public.is_org_member(organization_id));
