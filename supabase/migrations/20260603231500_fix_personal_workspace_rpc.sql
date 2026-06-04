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

  select organizations.id
  into workspace_id
  from public.organizations
  where organizations.owner_id = current_user_id
    and organizations.workspace_type = 'personal'
  order by organizations.created_at
  limit 1;

  if workspace_id is null then
    insert into public.organizations (name, owner_id, workspace_type)
    values (requested_name, current_user_id, 'personal')
    returning organizations.id into workspace_id;
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (workspace_id, current_user_id, 'owner')
  on conflict (organization_id, user_id) do update
  set role = case
    when public.organization_members.role in ('owner', 'admin')
      then public.organization_members.role
    else excluded.role
  end;

  return query
  select
    personal_workspace.id,
    personal_workspace.name,
    personal_workspace.created_at,
    personal_workspace.updated_at
  from public.organizations as personal_workspace
  where personal_workspace.id = workspace_id;
end;
$$;

revoke all on function public.ensure_personal_workspace(text) from public;
grant execute on function public.ensure_personal_workspace(text) to authenticated;
