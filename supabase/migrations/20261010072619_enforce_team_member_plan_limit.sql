create or replace function private.enforce_team_member_plan_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_status text; v_plan_id uuid; v_limit integer; v_count integer;
begin
  select s.status,s.plan_id into v_status,v_plan_id from public.workspace_subscriptions s where s.workspace_id=new.workspace_id;
  if v_status='grandfathered' then return new; end if;
  if v_status<>'active' or not exists(select 1 from public.workspace_subscriptions s where s.workspace_id=new.workspace_id and s.status='active' and (s.period_end is null or s.period_end>now())) then
    select id into v_plan_id from public.subscription_plans where slug='free' and active limit 1;
  end if;
  select max_team_members into v_limit from public.subscription_plans where id=v_plan_id;
  if v_limit is null then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.workspace_id::text,0));
  select count(*)::integer into v_count from public.workspace_members m where m.workspace_id=new.workspace_id;
  if v_count>=v_limit then raise exception 'Your plan has reached its team member limit.'; end if;
  return new;
end; $$;
drop trigger if exists enforce_team_member_plan_limit on public.workspace_members;
create trigger enforce_team_member_plan_limit before insert on public.workspace_members for each row execute function private.enforce_team_member_plan_limit();
