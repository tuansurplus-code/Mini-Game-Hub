-- Keep game-specific customization permissions separate from plan-wide branding.
alter table public.subscription_plan_game_permissions
  drop constraint if exists subscription_plan_game_permissions_customizations_check;

update public.subscription_plan_game_permissions
set allowed_customizations = array_remove(allowed_customizations, 'branding')
where 'branding' = any(allowed_customizations);

alter table public.subscription_plan_game_permissions
  add constraint subscription_plan_game_permissions_customizations_check
  check (allowed_customizations <@ array['text','colors','styles','advanced']::text[]);

update public.platform_game_templates
set feature_flags = feature_flags - 'branding'
where feature_flags ? 'branding';

-- Backfill any missing plan/game combinations with no access, then preserve this safe default for new plans.
insert into public.subscription_plan_game_permissions (plan_id, game_type, enabled, allowed_customizations)
select p.id, t.game_type, false, '{}'::text[]
from public.subscription_plans p
cross join public.platform_game_templates t
on conflict (plan_id, game_type) do nothing;

create or replace function private.seed_subscription_plan_game_permissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.subscription_plan_game_permissions (plan_id, game_type, enabled, allowed_customizations)
  select new.id, t.game_type, false, '{}'::text[]
  from public.platform_game_templates t
  on conflict (plan_id, game_type) do nothing;
  return new;
end;
$$;

revoke all on function private.seed_subscription_plan_game_permissions() from public, anon, authenticated;
drop trigger if exists seed_subscription_plan_game_permissions on public.subscription_plans;
create trigger seed_subscription_plan_game_permissions
after insert on public.subscription_plans
for each row execute function private.seed_subscription_plan_game_permissions();

-- Gate report data at the database boundary as well as the admin page.
create or replace function public.get_workspace_reporting(
  p_workspace_id uuid,
  p_from timestamptz default null,
  p_to_exclusive timestamptz default null
)
returns table(
  session_id uuid,
  played_at timestamptz,
  participant_id uuid,
  mobile text,
  customer_name text,
  customer_email text,
  customer_address text,
  campaign_id uuid,
  campaign_name text,
  game_id uuid,
  game_name text,
  public_slug text,
  result_type text,
  prize_name text,
  claimed_at text,
  coupon_code text,
  coupon_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_period_end timestamptz;
  v_feature_flags jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if p_workspace_id is null or not coalesce(private.is_workspace_reader(p_workspace_id), false) then
    raise exception 'Workspace access denied';
  end if;

  select s.status, s.period_end, p.feature_flags
    into v_status, v_period_end, v_feature_flags
  from public.workspace_subscriptions s
  left join public.subscription_plans p on p.id = s.plan_id
  where s.workspace_id = p_workspace_id;

  if v_status = 'grandfathered' then
    null;
  elsif v_status = 'active' and (v_period_end is null or v_period_end > now()) then
    if not coalesce(v_feature_flags->>'advanced_reports' = 'true', false) then
      raise exception 'Advanced reports are not available on your current plan.';
    end if;
  else
    select feature_flags into v_feature_flags
    from public.subscription_plans
    where slug = 'free' and active = true
    limit 1;
    if not coalesce(v_feature_flags->>'advanced_reports' = 'true', false) then
      raise exception 'Advanced reports are not available on your current plan.';
    end if;
  end if;

  return query
  select
    gs.id,
    coalesce(gs.completed_at, gs.started_at),
    p.id,
    coalesce(p.mobile_display, p.mobile_e164),
    p.name,
    p.email,
    p.address,
    c.id,
    c.name,
    g.id,
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
    w.metadata->>'claimed_at',
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
  where c.workspace_id = p_workspace_id
    and (p_from is null or coalesce(gs.completed_at, gs.started_at) >= p_from)
    and (p_to_exclusive is null or coalesce(gs.completed_at, gs.started_at) < p_to_exclusive)
  order by coalesce(gs.completed_at, gs.started_at) desc;
end;
$$;

revoke all on function public.get_workspace_reporting(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.get_workspace_reporting(uuid, timestamptz, timestamptz) to authenticated;
