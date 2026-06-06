alter table public.controls
  add column if not exists archived_at timestamptz,
  add column if not exists photos_purged_at timestamptz,
  add column if not exists details_purged_at timestamptz;

create table public.control_summaries (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  control_id uuid not null,
  building_id uuid not null,
  building_name text not null check (char_length(building_name) between 1 and 160),
  building_address text check (building_address is null or char_length(building_address) <= 240),
  sector text not null check (char_length(sector) between 1 and 160),
  controlled_by uuid not null references auth.users(id) on delete restrict,
  status public.control_status not null,
  quality_rating public.control_quality_rating,
  started_at timestamptz not null,
  completed_at timestamptz,
  general_comment text check (general_comment is null or char_length(general_comment) <= 3000),
  checklist_result_count integer not null default 0 check (checklist_result_count >= 0),
  non_compliant_result_count integer not null default 0 check (non_compliant_result_count >= 0),
  corrective_action_count integer not null default 0 check (corrective_action_count >= 0),
  photo_count integer not null default 0 check (photo_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, organization_id),
  unique (control_id, organization_id)
);

create index control_summaries_completed_idx
on public.control_summaries (organization_id, deleted_at, completed_at desc);

create trigger control_summaries_set_updated_at
before update on public.control_summaries
for each row execute function public.set_updated_at();

alter table public.control_summaries enable row level security;
alter table public.control_summaries force row level security;

grant select, insert, update on public.control_summaries to authenticated;

create policy "Control summaries are visible to organization members"
on public.control_summaries
for select
to authenticated
using ((select auth.uid()) is not null and public.is_org_member(organization_id));

create policy "Organization members can create control summaries"
on public.control_summaries
for insert
to authenticated
with check ((select auth.uid()) is not null and public.is_org_member(organization_id));

create policy "Organization members can update control summaries"
on public.control_summaries
for update
to authenticated
using ((select auth.uid()) is not null and public.is_org_member(organization_id))
with check ((select auth.uid()) is not null and public.is_org_member(organization_id));

create policy "Organization members can delete control photo objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'control-photos'
  and (select auth.uid()) is not null
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);
