create or replace function public.ensure_personal_workspace(workspace_name text default null)
returns table (
  organization_id uuid,
  organization_name text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  requested_name text := coalesce(nullif(btrim(workspace_name), ''), 'Mon espace');
  workspace_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext(current_user_id::text));

  select org.id
  into workspace_id
  from public.organizations as org
  where org.owner_id = current_user_id
    and org.workspace_type = 'personal'
  order by org.created_at
  limit 1;

  if workspace_id is null then
    insert into public.organizations (name, owner_id, workspace_type)
    values (requested_name, current_user_id, 'personal')
    returning id into workspace_id;
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (workspace_id, current_user_id, 'owner')
  on conflict on constraint organization_members_pkey do update
  set role = case
    when public.organization_members.role in ('owner', 'admin')
      then public.organization_members.role
    else excluded.role
  end;

  return query
  select
    org.id as organization_id,
    org.name as organization_name,
    org.created_at as created_at,
    org.updated_at as updated_at
  from public.organizations as org
  where org.id = workspace_id;
end;
$$;

revoke all on function public.ensure_personal_workspace(text) from public;
grant execute on function public.ensure_personal_workspace(text) to authenticated;
