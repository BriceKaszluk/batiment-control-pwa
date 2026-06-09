alter table public.buildings
  add column if not exists assigned_agent_ids uuid[] not null default '{}'::uuid[];

update public.buildings
set assigned_agent_ids = array[assigned_agent_id]
where assigned_agent_id is not null
  and cardinality(assigned_agent_ids) = 0;

create index if not exists buildings_assigned_agent_ids_gin_idx
on public.buildings using gin (assigned_agent_ids);
