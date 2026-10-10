create or replace function private.is_workspace_reader(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    join public.workspaces w on w.id = wm.workspace_id
    where wm.workspace_id = target_workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner', 'admin', 'editor', 'viewer')
      and w.status = 'active'
  );
$$;

revoke all on function private.is_workspace_reader(uuid) from public, anon;
grant execute on function private.is_workspace_reader(uuid) to authenticated;

drop policy if exists "workspace readers can view campaigns" on public.campaigns;
create policy "workspace readers can view campaigns"
on public.campaigns for select to authenticated
using (private.is_workspace_reader(workspace_id));

drop policy if exists "workspace readers can view campaign games" on public.campaign_games;
create policy "workspace readers can view campaign games"
on public.campaign_games for select to authenticated
using (
  exists (
    select 1 from public.campaigns c
    where c.id = campaign_games.campaign_id
      and private.is_workspace_reader(c.workspace_id)
  )
);

drop policy if exists "workspace readers can view games" on public.games;
create policy "workspace readers can view games"
on public.games for select to authenticated
using (private.is_workspace_reader(workspace_id));

drop policy if exists "workspace readers can view prizes" on public.prizes;
create policy "workspace readers can view prizes"
on public.prizes for select to authenticated
using (
  exists (
    select 1
    from public.campaign_games cg
    join public.campaigns c on c.id = cg.campaign_id
    where cg.id = prizes.campaign_game_id
      and private.is_workspace_reader(c.workspace_id)
  )
);

drop policy if exists "workspace readers can view winners" on public.winners;
create policy "workspace readers can view winners"
on public.winners for select to authenticated
using (
  exists (
    select 1
    from public.campaign_games cg
    join public.campaigns c on c.id = cg.campaign_id
    where cg.id = winners.campaign_game_id
      and private.is_workspace_reader(c.workspace_id)
  )
);

create or replace function public.get_workspace_team_members(p_workspace_id uuid)
returns table(user_id uuid, email text, role text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_workspace_reader(p_workspace_id) then
    raise exception 'Active workspace membership required.';
  end if;

  return query
  select wm.user_id, lower(au.email), wm.role, wm.created_at
  from public.workspace_members wm
  join auth.users au on au.id = wm.user_id
  where wm.workspace_id = p_workspace_id
  order by case when wm.role = 'owner' then 0 else 1 end, wm.created_at;
end;
$$;

create or replace function public.get_dashboard_stats()
returns table(
  total_games bigint,
  active_campaigns bigint,
  total_participants bigint,
  total_spins bigint,
  total_winners bigint,
  active_coupons bigint,
  redeemed_coupons bigint,
  prizes_distributed bigint
)
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
begin
  if not exists (
    select 1
    from public.workspace_members wm
    join public.workspaces ws on ws.id = wm.workspace_id
    where wm.user_id = (select auth.uid())
      and wm.role in ('owner', 'admin', 'editor', 'viewer')
      and ws.status = 'active'
  ) then
    raise exception 'Not authorized';
  end if;

  return query
  with accessible_workspaces as (
    select wm.workspace_id
    from public.workspace_members wm
    join public.workspaces ws on ws.id = wm.workspace_id
    where wm.user_id = (select auth.uid())
      and wm.role in ('owner', 'admin', 'editor', 'viewer')
      and ws.status = 'active'
  ),
  accessible_campaigns as (
    select c.id from public.campaigns c
    where c.workspace_id in (select workspace_id from accessible_workspaces)
  ),
  accessible_campaign_games as (
    select cg.id
    from public.campaign_games cg
    join public.campaigns c on c.id = cg.campaign_id
    where c.workspace_id in (select workspace_id from accessible_workspaces)
  )
  select
    (select count(*) from public.games g
      where g.workspace_id in (select workspace_id from accessible_workspaces)),
    (select count(*) from public.campaigns c
      where c.workspace_id in (select workspace_id from accessible_workspaces)
        and c.status = 'active'),
    (select count(distinct p.id) from public.participants p
      where p.campaign_id in (select id from accessible_campaigns)),
    (select count(*) from public.game_sessions gs
      where gs.campaign_game_id in (select id from accessible_campaign_games)),
    (select count(*) from public.winners w
      where w.campaign_game_id in (select id from accessible_campaign_games)),
    (select count(*) from public.coupons cp
      join public.winners w on w.id = cp.winner_id
      where w.campaign_game_id in (select id from accessible_campaign_games)
        and cp.status = 'active'),
    (select count(*) from public.coupons cp
      join public.winners w on w.id = cp.winner_id
      where w.campaign_game_id in (select id from accessible_campaign_games)
        and cp.status = 'redeemed'),
    (select count(*) from public.winners w
      where w.campaign_game_id in (select id from accessible_campaign_games));
end;
$$;

create or replace function public.get_campaign_overview_reporting()
returns table(
  campaign_id uuid,
  total_participants bigint,
  total_spins bigint,
  total_winners bigint,
  winning_rate numeric
)
language sql
security definer
set search_path = 'public', 'private'
as $$
  select
    c.id,
    count(distinct gs.participant_id),
    count(gs.id) filter (where gs.status = 'completed'),
    count(distinct w.id),
    case
      when count(gs.id) filter (where gs.status = 'completed') = 0 then 0::numeric
      else round(
        (count(distinct w.id)::numeric * 100) /
        count(gs.id) filter (where gs.status = 'completed'),
        1
      )
    end
  from public.campaigns c
  left join public.campaign_games cg on cg.campaign_id = c.id
  left join public.game_sessions gs on gs.campaign_game_id = cg.id
  left join public.winners w on w.session_id = gs.id
  where private.is_workspace_reader(c.workspace_id)
  group by c.id;
$$;

create or replace function public.get_game_reporting()
returns table(
  session_id uuid,
  played_at timestamptz,
  mobile text,
  customer_name text,
  customer_email text,
  customer_address text,
  campaign_name text,
  game_name text,
  public_slug text,
  result_type text,
  prize_name text,
  coupon_code text,
  coupon_status text
)
language sql
security definer
set search_path = 'public', 'private'
as $$
  select
    gs.id,
    coalesce(gs.completed_at, gs.started_at),
    coalesce(p.mobile_display, p.mobile_e164),
    p.name,
    p.email,
    p.address,
    c.name,
    g.name,
    cg.public_slug,
    case
      when gs.status <> 'completed' then gs.status
      when coalesce(pr.metadata->>'prize_type', '') = 'no_prize' then 'no_prize'
      when w.id is not null then 'win'
      when pr.id is not null then 'no_prize'
      else 'completed'
    end,
    pr.name,
    case when coalesce(pr.metadata->>'prize_type', '') = 'no_prize' then null else cp.code end,
    case when coalesce(pr.metadata->>'prize_type', '') = 'no_prize' then null else cp.status end
  from public.game_sessions gs
  join public.participants p on p.id = gs.participant_id
  join public.campaign_games cg on cg.id = gs.campaign_game_id
  join public.campaigns c on c.id = cg.campaign_id
  join public.games g on g.id = cg.game_id
  left join public.prizes pr on pr.id = gs.selected_prize_id
  left join public.winners w on w.session_id = gs.id
  left join public.coupons cp on cp.winner_id = w.id
  where private.is_workspace_reader(c.workspace_id)
  order by coalesce(gs.completed_at, gs.started_at) desc;
$$;

revoke all on function public.get_dashboard_stats() from public, anon;
grant execute on function public.get_dashboard_stats() to authenticated;
revoke all on function public.get_campaign_overview_reporting() from public, anon;
grant execute on function public.get_campaign_overview_reporting() to authenticated;
revoke all on function public.get_game_reporting() from public, anon;
grant execute on function public.get_game_reporting() to authenticated;
revoke all on function public.get_workspace_team_members(uuid) from public, anon;
grant execute on function public.get_workspace_team_members(uuid) to authenticated;
