create or replace function private.can_manage_billing()
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid()) and pa.active = true and pa.role in ('owner','admin')
  );
$function$;
revoke all on function private.can_manage_billing() from public, anon;
grant execute on function private.can_manage_billing() to authenticated;

drop policy if exists "platform admins can add subscription plans" on public.subscription_plans;
create policy "billing admins can add subscription plans" on public.subscription_plans for insert to authenticated with check (private.can_manage_billing());
drop policy if exists "platform admins can update subscription plans" on public.subscription_plans;
create policy "billing admins can update subscription plans" on public.subscription_plans for update to authenticated using (private.can_manage_billing()) with check (private.can_manage_billing());
drop policy if exists "platform admins can delete subscription plans" on public.subscription_plans;
create policy "billing admins can delete subscription plans" on public.subscription_plans for delete to authenticated using (private.can_manage_billing());

drop policy if exists "platform admins can add subscriptions" on public.workspace_subscriptions;
create policy "billing admins can add subscriptions" on public.workspace_subscriptions for insert to authenticated with check (private.can_manage_billing());
drop policy if exists "platform admins can update subscriptions" on public.workspace_subscriptions;
create policy "billing admins can update subscriptions" on public.workspace_subscriptions for update to authenticated using (private.can_manage_billing()) with check (private.can_manage_billing());
drop policy if exists "platform admins can delete subscriptions" on public.workspace_subscriptions;
create policy "billing admins can delete subscriptions" on public.workspace_subscriptions for delete to authenticated using (private.can_manage_billing());

drop policy if exists "platform admins can review subscription requests" on public.subscription_requests;
create policy "billing admins can review subscription requests" on public.subscription_requests for update to authenticated using (private.can_manage_billing()) with check (private.can_manage_billing());
