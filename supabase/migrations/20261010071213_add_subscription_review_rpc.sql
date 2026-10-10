create or replace function public.review_subscription_request(
  p_request_id uuid,
  p_decision text,
  p_review_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_request public.subscription_requests%rowtype;
  v_plan public.subscription_plans%rowtype;
  v_period_start timestamptz;
  v_period_end timestamptz;
begin
  if not private.can_manage_billing() then
    raise exception 'Not authorized to review subscription requests';
  end if;
  if p_decision not in ('approve', 'reject') then
    raise exception 'Decision must be approve or reject';
  end if;

  select * into v_request
  from public.subscription_requests
  where id = p_request_id
  for update;
  if not found then raise exception 'Subscription request not found'; end if;
  if v_request.status <> 'pending' then raise exception 'This request has already been reviewed'; end if;

  if p_decision = 'approve' then
    select * into v_plan
    from public.subscription_plans
    where id = v_request.requested_plan_id and active = true;
    if not found then raise exception 'The requested plan is no longer available'; end if;

    select case
      when s.status = 'active' and s.plan_id = v_plan.id and s.period_end > now()
      then s.period_end else now()
    end into v_period_start
    from public.workspace_subscriptions s
    where s.workspace_id = v_request.workspace_id;
    v_period_start := coalesce(v_period_start, now());
    v_period_end := v_period_start + interval '1 month';

    insert into public.workspace_subscriptions
      (workspace_id, plan_id, status, period_start, period_end, approved_by, approved_at, updated_at)
    values
      (v_request.workspace_id, v_plan.id, 'active', v_period_start, v_period_end, auth.uid(), now(), now())
    on conflict (workspace_id) do update set
      plan_id = excluded.plan_id,
      status = 'active',
      period_start = excluded.period_start,
      period_end = excluded.period_end,
      approved_by = excluded.approved_by,
      approved_at = excluded.approved_at,
      updated_at = now();
    update public.subscription_requests
      set status = 'approved', review_notes = nullif(left(coalesce(p_review_notes,''),1000),''),
          reviewed_by = auth.uid(), reviewed_at = now()
      where id = p_request_id;
  else
    update public.subscription_requests
      set status = 'rejected', review_notes = nullif(left(coalesce(p_review_notes,''),1000),''),
          reviewed_by = auth.uid(), reviewed_at = now()
      where id = p_request_id;
  end if;

  return jsonb_build_object('id', p_request_id, 'status', case when p_decision = 'approve' then 'approved' else 'rejected' end);
end;
$function$;

revoke all on function public.review_subscription_request(uuid, text, text) from public, anon;
grant execute on function public.review_subscription_request(uuid, text, text) to authenticated;
