drop policy if exists "platform admins manage subscription plans" on public.subscription_plans;
create policy "platform admins can add subscription plans"
  on public.subscription_plans for insert to authenticated
  with check (private.is_platform_admin());
create policy "platform admins can update subscription plans"
  on public.subscription_plans for update to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());
create policy "platform admins can delete subscription plans"
  on public.subscription_plans for delete to authenticated
  using (private.is_platform_admin());

drop policy if exists "platform admins manage subscriptions" on public.workspace_subscriptions;
create policy "platform admins can add subscriptions"
  on public.workspace_subscriptions for insert to authenticated
  with check (private.is_platform_admin());
create policy "platform admins can update subscriptions"
  on public.workspace_subscriptions for update to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());
create policy "platform admins can delete subscriptions"
  on public.workspace_subscriptions for delete to authenticated
  using (private.is_platform_admin());

create index if not exists subscription_requests_requested_plan_idx
  on public.subscription_requests(requested_plan_id);
create index if not exists subscription_requests_requested_by_idx
  on public.subscription_requests(requested_by);
create index if not exists subscription_requests_reviewed_by_idx
  on public.subscription_requests(reviewed_by);
create index if not exists workspace_subscriptions_plan_idx
  on public.workspace_subscriptions(plan_id);
create index if not exists workspace_subscriptions_approved_by_idx
  on public.workspace_subscriptions(approved_by);
