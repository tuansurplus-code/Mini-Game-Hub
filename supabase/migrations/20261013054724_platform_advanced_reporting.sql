-- Reports run with the caller's permissions and existing platform-staff RLS.
-- Only the identity columns needed to count players are read; no PII is returned.
grant select (id, campaign_id, mobile_e164) on public.participants to authenticated;

create or replace function public.get_platform_usage_report(
  p_from date, p_to date, p_workspace uuid default null, p_plan text default null,
  p_campaign uuid default null, p_game text default null
) returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
  v_previous timestamptz;
  v_result jsonb;
begin
  if (select auth.uid()) is null or not (select private.can_review_subscriptions()) then
    raise exception 'Platform staff access required' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_from > p_to
     or p_to > (now() at time zone 'Asia/Colombo')::date or p_to - p_from > 365 then
    raise exception 'Choose a valid date range of up to 366 days ending today or earlier' using errcode = '22023';
  end if;
  v_start := p_from::timestamp at time zone 'Asia/Colombo';
  v_end := (p_to + 1)::timestamp at time zone 'Asia/Colombo';
  v_previous := (p_from - (p_to - p_from + 1))::timestamp at time zone 'Asia/Colombo';

  with all_accounts as materialized (
    select w.id, w.name, w.status, w.created_at,
      coalesce(s.status, 'none') as subscription_status, s.period_end,
      coalesce(sp.slug, case when s.status = 'grandfathered' then 'grandfathered' else 'none' end) as plan_slug,
      coalesce(sp.name, case when s.status = 'grandfathered' then 'Grandfathered' else 'No plan' end) as plan_name,
      case when s.status = 'grandfathered' then 'Grandfathered'
           when s.status = 'active' and (s.period_end is null or s.period_end > now()) then sp.name
           else fp.name end as effective_plan,
      case when s.status = 'grandfathered' then null
           when s.status = 'active' and (s.period_end is null or s.period_end > now()) then sp.max_active_campaigns
           else fp.max_active_campaigns end as campaign_limit,
      case when s.status = 'grandfathered' then null
           when s.status = 'active' and (s.period_end is null or s.period_end > now()) then sp.max_monthly_participants
           else fp.max_monthly_participants end as monthly_limit,
      case when s.status = 'grandfathered' then null
           when s.status = 'active' and (s.period_end is null or s.period_end > now()) then sp.max_team_members
           else fp.max_team_members end as team_limit
    from public.workspaces w
    left join public.workspace_subscriptions s on s.workspace_id = w.id
    left join public.subscription_plans sp on sp.id = s.plan_id
    left join public.subscription_plans fp on fp.slug = 'free' and fp.active
  ), candidates as (
    select * from all_accounts a where (p_workspace is null or a.id = p_workspace)
      and (nullif(p_plan, '') is null or a.plan_slug = p_plan)
  ), scoped_campaigns as materialized (
    select c.id, c.name, c.workspace_id, a.name as workspace_name, c.status, a.plan_slug
    from public.campaigns c join candidates a on a.id = c.workspace_id
    where (p_campaign is null or c.id = p_campaign)
      and (nullif(p_game, '') is null or exists (
        select 1 from public.campaign_games cg join public.games g on g.id = cg.game_id
        where cg.campaign_id = c.id and g.type = p_game
      ))
  ), accounts as materialized (
    select * from candidates a
    where (p_campaign is null and nullif(p_game, '') is null)
      or exists (select 1 from scoped_campaigns c where c.workspace_id = a.id)
  ), scoped_games as materialized (
    select cg.id, c.id as campaign_id, c.workspace_id, c.plan_slug, g.type as game_type
    from public.campaign_games cg join scoped_campaigns c on c.id = cg.campaign_id
    join public.games g on g.id = cg.game_id
    where nullif(p_game, '') is null or g.type = p_game
  ), sessions as materialized (
    select gs.id, gs.status, gs.started_at, p.mobile_e164,
      g.workspace_id, g.campaign_id, g.game_type, g.plan_slug,
      (gs.started_at at time zone 'Asia/Colombo')::date as day,
      case when gs.started_at >= v_start then 'current' else 'previous' end as period
    from public.game_sessions gs join scoped_games g on g.id = gs.campaign_game_id
    join public.participants p on p.id = gs.participant_id
    where gs.started_at >= v_previous and gs.started_at < v_end
  ), reward_totals as (
    select w.session_id, count(w.id) as winners, count(cp.id) as issued,
      count(cp.id) filter (where cp.status = 'redeemed') as redeemed,
      count(cp.id) filter (where cp.status = 'active' and (cp.expires_at is null or cp.expires_at > now())) as unredeemed,
      count(cp.id) filter (where cp.status = 'expired' or (cp.status = 'active' and cp.expires_at <= now())) as expired,
      count(cp.id) filter (where cp.status = 'cancelled') as cancelled
    from public.winners w join sessions s on s.id = w.session_id
    left join public.coupons cp on cp.winner_id = w.id
    group by w.session_id
  ), facts as (
    select s.*, coalesce(r.winners,0) as winners, coalesce(r.issued,0) as issued,
      coalesce(r.redeemed,0) as redeemed, coalesce(r.unredeemed,0) as unredeemed,
      coalesce(r.expired,0) as expired, coalesce(r.cancelled,0) as cancelled
    from sessions s left join reward_totals r on r.session_id = s.id
  ), metrics as (
    select period,
      case when grouping(workspace_id)=0 then 'workspace'
           when grouping(campaign_id)=0 then 'campaign'
           when grouping(game_type)=0 then 'game'
           when grouping(plan_slug)=0 then 'plan'
           when grouping(day)=0 then 'day' else 'total' end as kind,
      case when grouping(workspace_id)=0 then workspace_id::text
           when grouping(campaign_id)=0 then campaign_id::text
           when grouping(game_type)=0 then game_type
           when grouping(plan_slug)=0 then plan_slug
           when grouping(day)=0 then day::text else '*' end as key,
      count(*) as sessions,
      count(distinct (workspace_id, mobile_e164)) as players,
      count(*) filter (where status='completed') as completed,
      count(*) filter (where status='failed') as failed,
      count(*) filter (where status='expired') as session_expired,
      count(*) filter (where status='started') as in_progress,
      sum(winners) as winners, sum(issued) as issued, sum(redeemed) as redeemed,
      sum(unredeemed) as unredeemed, sum(expired) as expired, sum(cancelled) as cancelled
    from facts
    group by grouping sets ((period),(period,workspace_id),(period,campaign_id),
      (period,game_type),(period,plan_slug),(period,day))
  ), month_usage as (
    -- Match the existing monthly limit: distinct mobile numbers per workspace.
    select c.workspace_id, count(distinct p.mobile_e164) as players
    from public.game_sessions gs join public.participants p on p.id = gs.participant_id
    join public.campaigns c on c.id = p.campaign_id join accounts a on a.id = c.workspace_id
    where gs.started_at >= (date_trunc('month',now() at time zone 'Asia/Colombo') at time zone 'Asia/Colombo')
      and gs.started_at < ((date_trunc('month',now() at time zone 'Asia/Colombo') + interval '1 month') at time zone 'Asia/Colombo')
    group by c.workspace_id
  ), last_activity as (
    select g.workspace_id, max(gs.started_at) as last_activity
    from public.game_sessions gs join scoped_games g on g.id = gs.campaign_game_id
    group by g.workspace_id
  ), workspace_rows as (
    select a.*, coalesce(m.players,0) as monthly_players, l.last_activity,
      (select count(*) from public.campaigns c where c.workspace_id=a.id and c.status='active') as active_campaigns,
      (select count(*) from public.workspace_members wm where wm.workspace_id=a.id) as team_members,
      (select count(*) from scoped_campaigns c where c.workspace_id=a.id) as scoped_campaigns,
      (select count(*) from scoped_campaigns c where c.workspace_id=a.id and c.status='active') as scoped_active_campaigns
    from accounts a left join month_usage m on m.workspace_id=a.id
    left join last_activity l on l.workspace_id=a.id
  ), request_rows as (
    select r.id, r.workspace_id, a.name as workspace_name, sp.name as requested_plan,
      r.status, r.created_at, r.reviewed_at
    from public.subscription_requests r join accounts a on a.id = r.workspace_id
    join public.subscription_plans sp on sp.id = r.requested_plan_id
    where r.created_at >= v_start and r.created_at < v_end
  )
  select jsonb_build_object(
    'generated_at', now(), 'from', p_from, 'to', p_to,
    'previous_from', (v_previous at time zone 'Asia/Colombo')::date, 'previous_to', p_from - 1,
    'metrics', coalesce((select jsonb_agg(to_jsonb(m)) from metrics m),'[]'::jsonb),
    'workspaces', coalesce((select jsonb_agg(to_jsonb(w) order by w.name,w.id) from workspace_rows w),'[]'::jsonb),
    'campaigns', coalesce((select jsonb_agg(to_jsonb(c) order by c.name,c.id) from scoped_campaigns c),'[]'::jsonb),
    'requests', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id) from request_rows r),'[]'::jsonb),
    'options', jsonb_build_object(
      'workspaces', coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'name',a.name) order by a.name,a.id) from all_accounts a),'[]'::jsonb),
      'plans', coalesce((select jsonb_agg(to_jsonb(p) order by p.name) from (
        select sp.slug as id,sp.name from public.subscription_plans sp
        union select a.plan_slug,a.plan_name from all_accounts a
      ) p),'[]'::jsonb),
      'campaigns', coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'workspace_id',c.workspace_id) order by c.name,c.id) from public.campaigns c),'[]'::jsonb),
      'games', coalesce((select jsonb_agg(g.type order by g.type) from (select distinct type from public.games) g),'[]'::jsonb)
    )
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.get_platform_usage_report(date,date,uuid,text,uuid,text) from public, anon;
grant execute on function public.get_platform_usage_report(date,date,uuid,text,uuid,text) to authenticated;
