-- Rollout: compatibility section first, deploy application, then enforcement section.
-- Additive prerequisites: apply before deploying the updated application.
create table if not exists private.request_rate_limits (
 bucket_key text primary key check (length(bucket_key)=64),
 request_count integer not null,
 expires_at timestamptz not null
);
alter table private.request_rate_limits enable row level security;
revoke all on private.request_rate_limits from public,anon,authenticated;
create index if not exists request_rate_limits_expiry_idx on private.request_rate_limits(expires_at);
create or replace function public.consume_request_rate_limit(p_key text,p_limit integer,p_window_ms integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_now timestamptz:=clock_timestamp();v_count integer;v_expires timestamptz;
begin
 if p_key !~ '^[0-9a-f]{64}$' or p_limit not between 1 and 10000 or p_window_ms not between 1000 and 86400000 then raise exception 'Invalid rate limit parameters';end if;
 delete from private.request_rate_limits where bucket_key in (select bucket_key from private.request_rate_limits where expires_at<v_now-interval '1 hour' limit 100);
 insert into private.request_rate_limits as bucket(bucket_key,request_count,expires_at)
 values(p_key,1,v_now+(p_window_ms*interval '1 millisecond'))
 on conflict(bucket_key) do update set
 request_count=case when bucket.expires_at<=v_now then 1 else least(bucket.request_count+1,p_limit+1) end,
 expires_at=case when bucket.expires_at<=v_now then v_now+(p_window_ms*interval '1 millisecond') else bucket.expires_at end
 returning request_count,expires_at into v_count,v_expires;
 return jsonb_build_object('allowed',v_count<=p_limit,'retry_after',greatest(1,ceil(extract(epoch from(v_expires-v_now)))::integer));
end $$;
revoke all on function public.consume_request_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_request_rate_limit(text,integer,integer) to service_role;

-- Intentional anonymous, read-only projection: never return stored coupon metadata.
create or replace function public.get_public_game_prizes(p_campaign_game_id uuid)
returns table(id uuid,name text,description text,image_url text,weight numeric,inventory integer,active boolean,metadata jsonb)
language sql stable security definer set search_path='' as $$
 select p.id,p.name,p.description,p.image_url,p.weight::numeric,p.inventory::integer,p.active,
 case when p.metadata->>'segment_color' ~ '^#[0-9a-fA-F]{6}$' then jsonb_build_object('segment_color',p.metadata->>'segment_color') else '{}'::jsonb end
 from public.prizes p join public.campaign_games cg on cg.id=p.campaign_game_id
 join public.campaigns c on c.id=cg.campaign_id join public.workspaces ws on ws.id=c.workspace_id
 where cg.id=p_campaign_game_id and p.active and cg.status='published' and c.status='active' and ws.status='active'
 and (c.starts_at is null or c.starts_at<=now()) and (c.ends_at is null or c.ends_at>=now()) order by p.created_at,p.id;
$$;
revoke all on function public.get_public_game_prizes(uuid) from public;
grant execute on function public.get_public_game_prizes(uuid) to anon,authenticated,service_role;
comment on function public.get_public_game_prizes(uuid) is 'Intentionally public read-only allowlisted projection of live prizes; coupon settings and codes are excluded.';

create or replace function public.claim_prize(p_session_id uuid,p_winner_id uuid,p_mobile_e164 text,p_name text,p_email text,p_address text,p_campaign_game_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.game_sessions gs join public.campaign_games cg on cg.id=gs.campaign_game_id
 join public.campaigns c on c.id=cg.campaign_id join public.workspaces ws on ws.id=c.workspace_id
 where gs.id=p_session_id and cg.id=p_campaign_game_id and cg.status='published' and c.status='active' and ws.status='active'
 and (c.starts_at is null or c.starts_at<=now()) and (c.ends_at is null or c.ends_at>=now())) then raise exception 'Prize claim unavailable';end if;
 return public.claim_prize(p_session_id,p_winner_id,p_mobile_e164,p_name,p_email,p_address);
end $$;
revoke all on function public.claim_prize(uuid,uuid,text,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.claim_prize(uuid,uuid,text,text,text,text,uuid) to service_role;

-- Staff can identify their own account before the mandatory MFA challenge.
drop policy if exists "staff can read own login status" on public.platform_admins;
create policy "staff can read own login status" on public.platform_admins for select to authenticated using(user_id=(select auth.uid()));

-- Apply after the updated application is READY. These restrictions close direct API bypasses.
drop policy if exists "public can view active prizes" on public.prizes;
revoke select on public.prizes from anon;
revoke execute on function public.play_spin(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.play_spin(uuid,text,uuid) to service_role;
revoke execute on function public.claim_prize(uuid,uuid,text,text,text,text) from public,anon,authenticated,service_role;
revoke execute on function public.create_customer_workspace(text,text) from public,anon;
grant execute on function public.create_customer_workspace(text,text) to authenticated;

CREATE OR REPLACE FUNCTION public.play_spin(p_campaign_game_id uuid, p_mobile_e164 text, p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  v_campaign_game public.campaign_games%rowtype;
  v_campaign public.campaigns%rowtype;
  v_participant public.participants%rowtype;
  v_session_id uuid;
  v_winner_id uuid;
  v_coupon_code text;
  v_coupon_status text;
  v_prize public.prizes%rowtype;
  v_prize_id uuid;
  v_total_weight numeric := 0;
  v_pick numeric;
  v_running numeric := 0;
  v_now timestamptz := now();
  v_attempt integer := 0;
  v_is_win boolean := true;
  v_play_frequency text;
  v_winning_limit integer;
  v_win_count integer := 0;
  v_limit_reached boolean := false;
  v_coupon_mode text;
  v_coupon_format jsonb;
  v_coupon_prefix text;
  v_coupon_separator text;
  v_coupon_character_type text;
  v_coupon_chars text;
  v_coupon_random text;
  v_coupon_random_length integer;
  v_i integer;
begin
  if p_campaign_game_id is null or nullif(trim(p_mobile_e164), '') is null or p_request_id is null then
    raise exception using message = 'Invalid spin request.';
  end if;

  if p_mobile_e164 !~ '^\+947[0-9]{8}$' then raise exception 'Invalid mobile number';end if;
  select cg.* into v_campaign_game from public.campaign_games cg where cg.id = p_campaign_game_id for update;
  if not found then raise exception using message = 'Game not found.'; end if;

  select c.* into v_campaign from public.campaigns c where c.id = v_campaign_game.campaign_id;
  if not found then raise exception using message = 'Campaign not found.'; end if;

  if not exists(select 1 from public.workspaces ws where ws.id=v_campaign.workspace_id and ws.status='active') then raise exception 'This game is not currently available.';end if;

  if v_campaign.status <> 'active' or v_campaign_game.status <> 'published'
     or (v_campaign.starts_at is not null and v_now < v_campaign.starts_at)
     or (v_campaign.ends_at is not null and v_now > v_campaign.ends_at) then
    raise exception using message = 'This game is not currently available.';
  end if;

  v_play_frequency := coalesce(v_campaign_game.rules->>'play_frequency', 'once_per_campaign');
  if v_play_frequency not in ('once_per_campaign', 'once_per_day', 'unlimited') then v_play_frequency := 'once_per_campaign'; end if;

  begin
    v_winning_limit := nullif(v_campaign_game.rules->>'winning_limit', '')::integer;
    if v_winning_limit is not null and v_winning_limit < 1 then v_winning_limit := null; end if;
  exception when invalid_text_representation or numeric_value_out_of_range then v_winning_limit := null;
  end;

  select gs.id, gs.selected_prize_id into v_session_id, v_prize_id from public.game_sessions gs join public.participants rp on rp.id=gs.participant_id where gs.request_id = p_request_id and gs.campaign_game_id=p_campaign_game_id and rp.mobile_e164=p_mobile_e164 limit 1;
  if v_session_id is not null then
    if v_prize_id is not null then
      select * into v_prize from public.prizes where id = v_prize_id;
      v_is_win := coalesce(v_prize.metadata->>'prize_type', 'winning') <> 'no_prize';
    end if;
    if v_is_win then
      select c.code, c.status into v_coupon_code, v_coupon_status from public.coupons c join public.winners w on w.id = c.winner_id where w.session_id = v_session_id limit 1;
      select w.id into v_winner_id from public.winners w where w.session_id = v_session_id limit 1;
    end if;
    return jsonb_build_object('session_id', v_session_id, 'prize_id', v_prize.id, 'prize_name', v_prize.name,
      'prize_description', v_prize.description, 'prize_image_url', v_prize.image_url, 'inventory', v_prize.inventory,
      'winner_id', v_winner_id, 'coupon_code', v_coupon_code, 'coupon_status', v_coupon_status, 'is_win', v_is_win, 'replayed', true);
  end if;

  select * into v_participant from public.participants where campaign_id = v_campaign.id and mobile_e164 = p_mobile_e164 for update;
  if not found then
    insert into public.participants (campaign_id, mobile_e164, mobile_display) values (v_campaign.id, p_mobile_e164, p_mobile_e164) returning * into v_participant;
  end if;

  if v_play_frequency = 'once_per_campaign' and exists (
    select 1 from public.game_sessions where campaign_game_id = p_campaign_game_id and participant_id = v_participant.id and status = 'completed'
  ) then raise exception using message = 'This mobile number has already played this campaign.';
  elsif v_play_frequency = 'once_per_day' and exists (
    select 1 from public.game_sessions where campaign_game_id = p_campaign_game_id and participant_id = v_participant.id and status = 'completed'
      and (completed_at at time zone 'Asia/Colombo')::date = (v_now at time zone 'Asia/Colombo')::date
  ) then raise exception using message = 'This mobile number has already played today. Please try again tomorrow.';
  end if;

  if v_winning_limit is not null then
    select count(*)::integer into v_win_count from public.winners where campaign_game_id = p_campaign_game_id and participant_id = v_participant.id;
    v_limit_reached := v_win_count >= v_winning_limit;
  end if;

  insert into public.game_sessions (campaign_game_id, participant_id, status, request_id, started_at)
  values (p_campaign_game_id, v_participant.id, 'started', p_request_id, v_now) returning id into v_session_id;

  select coalesce(sum(weight), 0) into v_total_weight from public.prizes
  where campaign_game_id = p_campaign_game_id and active = true and weight > 0
    and ((coalesce(metadata->>'prize_type', 'winning') = 'no_prize') or inventory is null or inventory > 0)
    and (not v_limit_reached or coalesce(metadata->>'prize_type', 'winning') = 'no_prize');

  if v_total_weight <= 0 then
    update public.game_sessions set status = 'failed', completed_at = now() where id = v_session_id;
    if v_limit_reached then raise exception using message = 'Winning limit reached and no no-prize result is currently available.'; end if;
    raise exception using message = 'No prizes are currently available.';
  end if;

  v_pick := random() * v_total_weight;
  for v_prize in
    select * from public.prizes where campaign_game_id = p_campaign_game_id and active = true and weight > 0
      and ((coalesce(metadata->>'prize_type', 'winning') = 'no_prize') or inventory is null or inventory > 0)
      and (not v_limit_reached or coalesce(metadata->>'prize_type', 'winning') = 'no_prize') order by id
  loop
    v_running := v_running + v_prize.weight;
    if v_pick <= v_running then exit; end if;
  end loop;

  if v_prize.id is null then
    update public.game_sessions set status = 'failed', completed_at = now() where id = v_session_id;
    raise exception using message = 'Unable to select a prize.';
  end if;

  v_is_win := coalesce(v_prize.metadata->>'prize_type', 'winning') <> 'no_prize';
  if v_is_win and v_prize.inventory is not null then
    update public.prizes set inventory = inventory - 1 where id = v_prize.id and inventory > 0;
    if not found then
      update public.game_sessions set status = 'failed', completed_at = now() where id = v_session_id;
      raise exception using message = 'Prize inventory changed. Please spin again.';
    end if;
    v_prize.inventory := v_prize.inventory - 1;
  end if;

  update public.game_sessions set status = 'completed', selected_prize_id = v_prize.id, completed_at = now() where id = v_session_id;

  if v_is_win then
    insert into public.winners (session_id, campaign_game_id, participant_id, prize_id, metadata)
    values (v_session_id, p_campaign_game_id, v_participant.id, v_prize.id, jsonb_build_object('request_id', p_request_id)) returning id into v_winner_id;

    v_coupon_mode := coalesce(v_prize.metadata->>'coupon_mode', 'auto');
    if v_coupon_mode = 'fixed' and nullif(trim(v_prize.metadata->>'fixed_coupon_code'), '') is not null then
      v_coupon_code := upper(trim(v_prize.metadata->>'fixed_coupon_code'));
      insert into public.coupons (winner_id, code, status, metadata)
      values (v_winner_id, v_coupon_code, 'active', jsonb_build_object('campaign_game_id', p_campaign_game_id, 'prize_id', v_prize.id, 'coupon_mode', 'fixed'));
      v_coupon_status := 'active';
    else
      v_coupon_format := v_campaign_game.rules->'coupon_code';
      if v_coupon_format is null or jsonb_typeof(v_coupon_format) <> 'object' then
        loop
          v_attempt := v_attempt + 1;
          v_coupon_code := 'SG-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
          exit when not exists (select 1 from public.coupons where code = v_coupon_code);
          if v_attempt >= 5 then raise exception using message = 'Unable to generate coupon.'; end if;
        end loop;
      else
        v_coupon_prefix := upper(regexp_replace(coalesce(v_coupon_format->>'prefix', 'SG'), '[^A-Za-z0-9]', '', 'g'));
        v_coupon_separator := case when coalesce(v_coupon_format->>'separator', '-') = '' then '' else '-' end;
        v_coupon_character_type := coalesce(v_coupon_format->>'character_type', 'alphanumeric');
        v_coupon_chars := case v_coupon_character_type when 'numbers' then '0123456789' when 'letters' then 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' else 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' end;
        begin
          v_coupon_random_length := coalesce((v_coupon_format->>'random_length')::integer, 8);
        exception when others then v_coupon_random_length := 8;
        end;
        v_coupon_random_length := greatest(4, least(20, v_coupon_random_length));
        loop
          v_attempt := v_attempt + 1;
          v_coupon_random := '';
          for v_i in 1..v_coupon_random_length loop
            v_coupon_random := v_coupon_random || substr(v_coupon_chars, floor(random() * length(v_coupon_chars))::integer + 1, 1);
          end loop;
          v_coupon_code := v_coupon_prefix || case when v_coupon_prefix <> '' then v_coupon_separator else '' end || v_coupon_random;
          exit when not exists (select 1 from public.coupons where code = v_coupon_code);
          if v_attempt >= 5 then raise exception using message = 'Unable to generate coupon.'; end if;
        end loop;
      end if;
      insert into public.coupons (winner_id, code, status, metadata)
      values (v_winner_id, v_coupon_code, 'active', jsonb_build_object('campaign_game_id', p_campaign_game_id, 'prize_id', v_prize.id, 'coupon_mode', 'auto'));
      v_coupon_status := 'active';
    end if;
  else
    v_winner_id := null; v_coupon_code := null; v_coupon_status := null;
  end if;

  return jsonb_build_object('session_id', v_session_id, 'winner_id', v_winner_id, 'prize_id', v_prize.id,
    'prize_name', v_prize.name, 'prize_description', v_prize.description, 'prize_image_url', v_prize.image_url,
    'inventory', v_prize.inventory, 'coupon_code', v_coupon_code, 'coupon_status', v_coupon_status, 'is_win', v_is_win, 'replayed', false);
end;
$function$


create or replace function private.is_workspace_member(target_workspace_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.workspace_members wm join public.workspaces ws on ws.id=wm.workspace_id join auth.users u on u.id=wm.user_id
 where wm.workspace_id=target_workspace_id and wm.user_id=(select auth.uid()) and ws.status='active'
 and coalesce(u.raw_app_meta_data->>'must_change_password','false')<>'true');$$;

create or replace function private.is_workspace_owner(target_workspace_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.workspace_members wm join public.workspaces ws on ws.id=wm.workspace_id join auth.users u on u.id=wm.user_id
 where wm.workspace_id=target_workspace_id and wm.user_id=(select auth.uid()) and ws.status='active' and wm.role in ('owner')
 and coalesce(u.raw_app_meta_data->>'must_change_password','false')<>'true');$$;

create or replace function private.is_workspace_editor(target_workspace_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.workspace_members wm join public.workspaces ws on ws.id=wm.workspace_id join auth.users u on u.id=wm.user_id
 where wm.workspace_id=target_workspace_id and wm.user_id=(select auth.uid()) and ws.status='active' and wm.role in ('owner','admin','editor')
 and coalesce(u.raw_app_meta_data->>'must_change_password','false')<>'true');$$;

create or replace function private.is_workspace_reader(target_workspace_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.workspace_members wm join public.workspaces ws on ws.id=wm.workspace_id join auth.users u on u.id=wm.user_id
 where wm.workspace_id=target_workspace_id and wm.user_id=(select auth.uid()) and ws.status='active' and wm.role in ('owner','admin','editor','viewer')
 and coalesce(u.raw_app_meta_data->>'must_change_password','false')<>'true');$$;

create or replace function private.is_platform_admin() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select auth.jwt()->>'aal'),'')='aal2' and exists(select 1 from public.platform_admins pa join auth.users u on u.id=pa.user_id
 where pa.user_id=(select auth.uid()) and pa.active and pa.role in ('owner','admin','support') and coalesce(u.raw_app_meta_data->>'must_change_password','false')<>'true');$$;

create or replace function private.can_manage_billing() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select auth.jwt()->>'aal'),'')='aal2' and exists(select 1 from public.platform_admins pa join auth.users u on u.id=pa.user_id
 where pa.user_id=(select auth.uid()) and pa.active and pa.role in ('owner','admin') and coalesce(u.raw_app_meta_data->>'must_change_password','false')<>'true');$$;

create or replace function private.can_review_subscriptions() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select auth.jwt()->>'aal'),'')='aal2' and exists(select 1 from public.platform_admins pa join auth.users u on u.id=pa.user_id
 where pa.user_id=(select auth.uid()) and pa.active and pa.role in ('owner','admin','support') and coalesce(u.raw_app_meta_data->>'must_change_password','false')<>'true');$$;

create or replace function private.can_manage_game_templates() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select auth.jwt()->>'aal'),'')='aal2' and exists(select 1 from public.platform_admins pa join auth.users u on u.id=pa.user_id
 where pa.user_id=(select auth.uid()) and pa.active and pa.role in ('owner','admin') and coalesce(u.raw_app_meta_data->>'must_change_password','false')<>'true');$$;

revoke all on function private.can_manage_game_templates() from public;
grant execute on function private.can_manage_game_templates() to authenticated,service_role;
drop policy if exists "platform admins manage game templates" on public.platform_game_templates;
create policy "platform admins manage game templates" on public.platform_game_templates for all to authenticated using(private.can_manage_game_templates()) with check(private.can_manage_game_templates());
drop policy if exists "platform admins manage game plan permissions" on public.subscription_plan_game_permissions;
create policy "platform admins manage game plan permissions" on public.subscription_plan_game_permissions for all to authenticated using(private.can_manage_game_templates()) with check(private.can_manage_game_templates());

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
 RETURNS TABLE(total_games bigint, active_campaigns bigint, total_participants bigint, total_spins bigint, total_winners bigint, active_coupons bigint, redeemed_coupons bigint, prizes_distributed bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
begin
  if not exists (
    select 1 from public.workspace_members wm join public.workspaces ws on ws.id=wm.workspace_id
    where wm.user_id=(select auth.uid()) and wm.role in ('owner','admin','editor','viewer') and ws.status='active' and coalesce((select u.raw_app_meta_data->>'must_change_password' from auth.users u where u.id=(select auth.uid())),'false')<>'true'
  ) then raise exception 'Not authorized'; end if;
  return query
  with accessible_workspaces as (
    select wm.workspace_id from public.workspace_members wm join public.workspaces ws on ws.id=wm.workspace_id
    where wm.user_id=(select auth.uid()) and wm.role in ('owner','admin','editor','viewer') and ws.status='active' and coalesce((select u.raw_app_meta_data->>'must_change_password' from auth.users u where u.id=(select auth.uid())),'false')<>'true'
  ),
  accessible_campaigns as (
    select c.id from public.campaigns c where c.workspace_id in (select workspace_id from accessible_workspaces)
  ),
  accessible_campaign_games as (
    select cg.id from public.campaign_games cg join public.campaigns c on c.id=cg.campaign_id
    where c.workspace_id in (select workspace_id from accessible_workspaces)
  )
  select
    (select count(*) from public.games g where g.workspace_id in (select workspace_id from accessible_workspaces)),
    (select count(*) from public.campaigns c where c.workspace_id in (select workspace_id from accessible_workspaces) and c.status='active'),
    (select count(distinct p.id) from public.participants p where p.campaign_id in (select id from accessible_campaigns)),
    (select count(*) from public.game_sessions gs where gs.campaign_game_id in (select id from accessible_campaign_games)),
    (select count(*) from public.winners w where w.campaign_game_id in (select id from accessible_campaign_games)),
    (select count(*) from public.coupons cp join public.winners w on w.id=cp.winner_id where w.campaign_game_id in (select id from accessible_campaign_games) and cp.status='active'),
    (select count(*) from public.coupons cp join public.winners w on w.id=cp.winner_id where w.campaign_game_id in (select id from accessible_campaign_games) and cp.status='redeemed'),
    (select count(*) from public.winners w where w.campaign_game_id in (select id from accessible_campaign_games));
end;
$function$

