alter table public.platform_admins add column full_name text not null default '';
alter table public.platform_admins add column contact_number text not null default '';

create table public.platform_staff_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  target_id uuid not null,
  action text not null check (action in ('create','update')),
  before_state jsonb,
  after_state jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.platform_staff_audit enable row level security;
revoke all on public.platform_staff_audit from anon, authenticated;
grant select, insert on public.platform_staff_audit to service_role;

-- Service-only atomic writer. Serializes role edits and rechecks the actor under lock.
create function public.manage_platform_staff(p_actor uuid, p_target uuid, p_role text, p_active boolean, p_full_name text, p_contact_number text, p_create boolean)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_before jsonb; v_after jsonb;
begin
  lock table public.platform_admins in share row exclusive mode;
  if not exists (select 1 from public.platform_admins pa join auth.users u on u.id=pa.user_id where pa.user_id=p_actor and pa.role='owner' and pa.active and coalesce(u.raw_app_meta_data->>'must_change_password','false') <> 'true') then
    raise exception 'Only active Super Admins can manage staff.';
  end if;
  if p_role is null or p_role not in ('owner','admin','support') or p_active is null or p_create is null or p_full_name is null or length(trim(p_full_name)) not between 1 and 120 or p_contact_number is null or length(p_contact_number) not between 7 and 25 then
    raise exception 'Invalid staff details.';
  end if;
  select to_jsonb(pa) into v_before from public.platform_admins pa where user_id=p_target;
  if p_create then
    if v_before is not null then raise exception 'Staff account already exists.'; end if;
    insert into public.platform_admins(user_id,role,active,full_name,contact_number) values (p_target,p_role,p_active,trim(p_full_name),trim(p_contact_number));
  else
    if v_before is null then raise exception 'Staff account not found.'; end if;
    if v_before->>'role'='owner' and (v_before->>'active')::boolean and (p_role<>'owner' or not p_active)
      and not exists (select 1 from public.platform_admins where role='owner' and active and user_id<>p_target) then
      raise exception 'The last active Super Admin cannot be demoted or disabled.';
    end if;
    update public.platform_admins set role=p_role,active=p_active,full_name=trim(p_full_name),contact_number=trim(p_contact_number) where user_id=p_target;
  end if;
  select to_jsonb(pa) into v_after from public.platform_admins pa where user_id=p_target;
  insert into public.platform_staff_audit(actor_id,target_id,action,before_state,after_state)
    values(p_actor,p_target,case when p_create then 'create' else 'update' end,v_before,v_after);
end;
$$;

CREATE OR REPLACE FUNCTION public.review_subscription_request(p_request_id uuid, p_decision text, p_review_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_request public.subscription_requests%rowtype;
  v_plan public.subscription_plans%rowtype;
  v_current public.workspace_subscriptions%rowtype;
  v_start timestamptz;
  v_end timestamptz;
begin
  if not private.can_review_subscriptions() then
    raise exception using message = 'Only authorized platform staff can review subscriptions.';
  end if;
  if p_request_id is null or p_decision is null or p_decision not in ('approve','reject') then
    raise exception using message = 'Invalid subscription review request.';
  end if;

  select * into v_request
  from public.subscription_requests
  where id = p_request_id
  for update;
  if not found then raise exception using message = 'Subscription request not found.'; end if;
  if v_request.status <> 'pending' then
    raise exception using message = 'This subscription request has already been reviewed.';
  end if;

  if p_decision = 'approve' then
    select * into v_plan
    from public.subscription_plans
    where id = v_request.requested_plan_id
    for share;
    if not found or not v_plan.active then
      raise exception using message = 'The requested plan is no longer available.';
    end if;

    select * into v_current
    from public.workspace_subscriptions
    where workspace_id = v_request.workspace_id
    for update;

    if found and v_current.plan_id = v_plan.id and v_current.status = 'active'
       and v_current.period_end is not null and v_current.period_end > now() then
      v_start := v_current.period_start;
      v_end := v_current.period_end + interval '1 month';
    else
      v_start := now();
      v_end := now() + interval '1 month';
    end if;

    insert into public.workspace_subscriptions
      (workspace_id,plan_id,status,period_start,period_end,approved_by,approved_at,updated_at)
    values
      (v_request.workspace_id,v_plan.id,'active',v_start,v_end,(select auth.uid()),now(),now())
    on conflict (workspace_id) do update
      set plan_id = excluded.plan_id,
          status = 'active',
          period_start = excluded.period_start,
          period_end = excluded.period_end,
          approved_by = excluded.approved_by,
          approved_at = excluded.approved_at,
          updated_at = excluded.updated_at;

    update public.subscription_requests
    set status = 'approved',
        review_notes = left(nullif(trim(p_review_notes), ''), 1000),
        reviewed_by = (select auth.uid()),
        reviewed_at = now()
    where id = p_request_id;
  else
    update public.subscription_requests
    set status = 'rejected',
        review_notes = left(nullif(trim(p_review_notes), ''), 1000),
        reviewed_by = (select auth.uid()),
        reviewed_at = now()
    where id = p_request_id;
  end if;

  return jsonb_build_object('id',p_request_id,'status',case when p_decision='approve' then 'approved' else 'rejected' end);
end;
$function$;
revoke all on function public.manage_platform_staff(uuid,uuid,text,boolean,text,text,boolean) from public, anon, authenticated;
grant execute on function public.manage_platform_staff(uuid,uuid,text,boolean,text,text,boolean) to service_role;

-- Operator reviews are separate from plan/price management.
create function private.can_review_subscriptions() returns boolean language sql stable security definer set search_path = '' as $$
 select exists (select 1 from public.platform_admins pa join auth.users u on u.id=pa.user_id
 where pa.user_id=(select auth.uid()) and pa.active and pa.role in ('owner','admin','support')
 and coalesce(u.raw_app_meta_data->>'must_change_password','false') <> 'true');
$$;
revoke all on function private.can_review_subscriptions() from public, anon;
grant execute on function private.can_review_subscriptions() to authenticated, service_role;
create or replace function private.can_manage_billing() returns boolean language sql stable security definer set search_path = '' as $$
 select exists (select 1 from public.platform_admins pa join auth.users u on u.id=pa.user_id
 where pa.user_id=(select auth.uid()) and pa.active and pa.role in ('owner','admin')
 and coalesce(u.raw_app_meta_data->>'must_change_password','false') <> 'true');
$$;

-- Platform staff can inspect activity across customer workspaces, without write access.
create policy "platform staff can view campaigns" on public.campaigns for select to authenticated using ((select private.can_review_subscriptions()));
create policy "platform staff can view games" on public.games for select to authenticated using ((select private.can_review_subscriptions()));
create policy "platform staff can view campaign_games" on public.campaign_games for select to authenticated using ((select private.can_review_subscriptions()));
create policy "platform staff can view participants" on public.participants for select to authenticated using ((select private.can_review_subscriptions()));
create policy "platform staff can view game_sessions" on public.game_sessions for select to authenticated using ((select private.can_review_subscriptions()));
create policy "platform staff can view winners" on public.winners for select to authenticated using ((select private.can_review_subscriptions()));
create policy "platform staff can view coupons" on public.coupons for select to authenticated using ((select private.can_review_subscriptions()));
