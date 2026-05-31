create type public.agent_status as enum (
  'present',
  'absent',
  'sick_leave',
  'paid_leave',
  'replacement',
  'unknown'
);

create type public.building_priority_level as enum (
  'low',
  'normal',
  'high',
  'critical'
);

alter table public.buildings
  add column sector text not null default 'Secteur non renseigne'
    check (char_length(sector) between 1 and 160),
  add column assigned_agent_name text
    check (assigned_agent_name is null or char_length(assigned_agent_name) <= 160),
  add column agent_status public.agent_status not null default 'unknown',
  add column priority_level public.building_priority_level not null default 'normal',
  add column internal_notes text
    check (internal_notes is null or char_length(internal_notes) <= 3000),
  add column service_days jsonb not null default '[]'::jsonb,
  add column areas_to_check jsonb not null default '[]'::jsonb;

update public.buildings
set internal_notes = access_notes
where internal_notes is null and access_notes is not null;

