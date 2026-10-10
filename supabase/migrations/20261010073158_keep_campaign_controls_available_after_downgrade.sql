create or replace function private.enforce_campaign_plan_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_status text; v_plan_id uuid; v_limit integer; v_sched boolean; v_count integer;
begin
  if tg_op='UPDATE' and new.status is not distinct from old.status and new.scheduling_mode is not distinct from old.scheduling_mode then return new; end if;
  select s.status,s.plan_id into v_status,v_plan_id from public.workspace_subscriptions s where s.workspace_id=new.workspace_id;
  if v_status='grandfathered' then return new; end if;
  if v_status<>'active' or not exists(select 1 from public.workspace_subscriptions s where s.workspace_id=new.workspace_id and s.status='active' and (s.period_end is null or s.period_end>now())) then
    select id into v_plan_id from public.subscription_plans where slug='free' and active limit 1;
  end if;
  select max_active_campaigns,coalesce((feature_flags->>'automatic_scheduling')::boolean,false) into v_limit,v_sched from public.subscription_plans where id=v_plan_id;
  if new.scheduling_mode='automatic' and not coalesce(v_sched,false)
     and (tg_op='INSERT' or old.scheduling_mode is distinct from 'automatic') then
    raise exception 'Automatic scheduling is not available on the current plan.';
  end if;
  if new.status='active' and (tg_op='INSERT' or old.status is distinct from 'active') then
    perform pg_advisory_xact_lock(hashtextextended(new.workspace_id::text,0));
    if v_limit is not null then
      select count(*)::integer into v_count from public.campaigns c where c.workspace_id=new.workspace_id and c.status='active' and (tg_op='INSERT' or c.id<>new.id);
      if v_count>=v_limit then raise exception 'Your plan has reached its active campaign limit. Upgrade your plan to publish another campaign.'; end if;
    end if;
  end if; return new;
end; $$;