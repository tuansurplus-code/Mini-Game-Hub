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
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if p_workspace_id is null or not coalesce(private.is_workspace_reader(p_workspace_id), false) then
    raise exception 'Workspace access denied';
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
