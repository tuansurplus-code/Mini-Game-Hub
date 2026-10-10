create or replace function public.get_workspace_team_members(p_workspace_id uuid)
returns table(user_id uuid, email text, role text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if not exists (
    select 1
    from public.workspace_members wm
    join public.workspaces w on w.id = wm.workspace_id
    where wm.workspace_id = p_workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner', 'admin', 'editor')
      and w.status = 'active'
  ) then
    raise exception 'Active workspace administrator access required.';
  end if;

  return query
  select wm.user_id, lower(au.email), wm.role, wm.created_at
  from public.workspace_members wm
  join auth.users au on au.id = wm.user_id
  where wm.workspace_id = p_workspace_id
  order by case when wm.role = 'owner' then 0 else 1 end, wm.created_at;
end;
$function$;

revoke all on function public.get_workspace_team_members(uuid) from public, anon;
grant execute on function public.get_workspace_team_members(uuid) to authenticated;
