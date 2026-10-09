-- Owners can edit business identity, but never ownership, status or URLs.
revoke update on public.workspaces from authenticated;
grant update (name, settings) on public.workspaces to authenticated;
create policy "owners can update workspace profile"
on public.workspaces for update to authenticated
using (owner_user_id = (select auth.uid()) and status = 'active')
with check (owner_user_id = (select auth.uid()) and status = 'active');
