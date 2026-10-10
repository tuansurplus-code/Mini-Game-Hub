create or replace function private.enforce_monthly_participant_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_workspace_id uuid; v_mobile text; v_status text; v_plan_id uuid; v_limit integer; v_count integer; v_exists boolean;
  v_month_start timestamptz := (date_trunc('month',now() at time zone 'Asia/Colombo') at time zone 'Asia/Colombo');
  v_next_month timestamptz := ((date_trunc('month',now() at time zone 'Asia/Colombo')+interval '1 month') at time zone 'Asia/Colombo');
begin
  select c.workspace_id,p.mobile_e164 into v_workspace_id,v_mobile from public.participants p join public.campaigns c on c.id=p.campaign_id where p.id=new.participant_id;
  if v_workspace_id is null then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_workspace_id::text,0));
  select s.status,s.plan_id into v_status,v_plan_id from public.workspace_subscriptions s where s.workspace_id=v_workspace_id;
  if v_status='grandfathered' then return new; end if;
  if v_status<>'active' or not exists(select 1 from public.workspace_subscriptions s where s.workspace_id=v_workspace_id and s.status='active' and (s.period_end is null or s.period_end>now())) then
    select id into v_plan_id from public.subscription_plans where slug='free' and active limit 1;
  end if;
  select max_monthly_participants into v_limit from public.subscription_plans where id=v_plan_id;
  if v_limit is null then return new; end if;
  select exists(select 1 from public.game_sessions gs join public.participants p on p.id=gs.participant_id join public.campaigns c on c.id=p.campaign_id
    where c.workspace_id=v_workspace_id and p.mobile_e164=v_mobile and gs.started_at>=v_month_start and gs.started_at<v_next_month) into v_exists;
  if v_exists then return new; end if;
  select count(distinct p.mobile_e164)::integer into v_count from public.game_sessions gs join public.participants p on p.id=gs.participant_id
    join public.campaigns c on c.id=p.campaign_id where c.workspace_id=v_workspace_id and gs.started_at>=v_month_start and gs.started_at<v_next_month;
  if v_count>=v_limit then raise exception 'This workspace has reached its monthly unique participant limit. Please contact the workspace owner.'; end if;
  return new;
end; $$;
drop trigger if exists enforce_monthly_participant_limit on public.game_sessions;
create trigger enforce_monthly_participant_limit before insert on public.game_sessions for each row execute function private.enforce_monthly_participant_limit();
