create or replace function public.review_subscription_request(p_request_id uuid, p_decision text, p_review_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_request public.subscription_requests%rowtype;
  v_plan public.subscription_plans%rowtype;
  v_current public.workspace_subscriptions%rowtype;
  v_start timestamptz;
  v_end timestamptz;
begin
  if not private.can_manage_billing() then
    raise exception using message = 'Only billing administrators can review subscriptions.';
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

revoke all on function public.review_subscription_request(uuid, text, text) from public, anon;
grant execute on function public.review_subscription_request(uuid, text, text) to authenticated;
