create or replace function private.get_coupon_management_core(
  p_search text default null,
  p_status text default null
)
returns table(
  id uuid,
  code text,
  status text,
  expires_at timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz,
  mobile text,
  campaign_name text,
  game_name text,
  prize_name text,
  public_slug text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  return query
  select
    cp.id,
    cp.code,
    cp.status,
    cp.expires_at,
    cp.redeemed_at,
    cp.created_at,
    case
      when length(coalesce(p.mobile_display, '')) >= 7
        then left(p.mobile_display, 3) || '****' || right(p.mobile_display, 3)
      else '***'
    end,
    c.name,
    g.name,
    pr.name,
    cg.public_slug
  from public.coupons cp
  join public.winners w on w.id = cp.winner_id
  join public.participants p on p.id = w.participant_id
  join public.campaign_games cg on cg.id = w.campaign_game_id
  join public.campaigns c on c.id = cg.campaign_id
  join public.games g on g.id = cg.game_id
  join public.prizes pr on pr.id = w.prize_id
  where private.is_workspace_reader(c.workspace_id)
    and (
      nullif(trim(p_search), '') is null
      or cp.code ilike '%' || trim(p_search) || '%'
      or p.mobile_display ilike '%' || trim(p_search) || '%'
      or c.name ilike '%' || trim(p_search) || '%'
      or pr.name ilike '%' || trim(p_search) || '%'
    )
    and (nullif(trim(p_status), '') is null or cp.status = trim(p_status))
  order by cp.created_at desc;
end;
$$;

revoke all on function private.get_coupon_management_core(text, text) from public, anon;
grant execute on function private.get_coupon_management_core(text, text) to authenticated;