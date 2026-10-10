-- Workspace team invitations and owner-only membership administration.
create or replace function private.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role = 'owner'
  );
$function$;

revoke all on function private.is_workspace_owner(uuid) from public;
grant execute on function private.is_workspace_owner(uuid) to authenticated;

-- Editors must never be able to grant roles or change workspace membership.
drop policy if exists "workspace owners and admins can manage membership" on public.workspace_members;
revoke insert, update, delete on public.workspace_members from authenticated;
grant update (role), delete on public.workspace_members to authenticated;

create policy "workspace owners can change non-owner roles"
on public.workspace_members for update to authenticated
using (
  (select private.is_workspace_owner(workspace_id))
  and role <> 'owner'
)
with check (
  (select private.is_workspace_owner(workspace_id))
  and role in ('admin', 'editor', 'viewer')
);

create policy "workspace owners can remove non-owner members"
on public.workspace_members for delete to authenticated
using (
  (select private.is_workspace_owner(workspace_id))
  and role <> 'owner'
);

create table if not exists public.workspace_invitations (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'editor')),
  token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  check (email = lower(btrim(email))),
  check (expires_at > created_at)
);

create index if not exists workspace_invitations_workspace_created_idx
  on public.workspace_invitations(workspace_id, created_at desc);
create index if not exists workspace_invitations_email_idx
  on public.workspace_invitations(email);

alter table public.workspace_invitations enable row level security;
revoke all on public.workspace_invitations from anon, authenticated;
grant select on public.workspace_invitations to authenticated;
grant insert (id, workspace_id, email, role, token_hash, invited_by, expires_at)
  on public.workspace_invitations to authenticated;
grant delete on public.workspace_invitations to authenticated;

create policy "workspace owners can view invitations"
on public.workspace_invitations for select to authenticated
using ((select private.is_workspace_owner(workspace_id)));

create policy "workspace owners can create invitations"
on public.workspace_invitations for insert to authenticated
with check (
  (select private.is_workspace_owner(workspace_id))
  and invited_by = (select auth.uid())
  and role in ('admin', 'editor')
  and accepted_at is null
  and revoked_at is null
);

create policy "workspace owners can revoke invitations"
on public.workspace_invitations for delete to authenticated
using ((select private.is_workspace_owner(workspace_id)));

create or replace function public.accept_workspace_invitation(
  p_invitation_id uuid,
  p_token_hash text
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_user_email text;
  v_email_confirmed_at timestamptz;
  v_invitation public.workspace_invitations%rowtype;
begin
  if v_user_id is null then
    raise exception 'Sign in before accepting this invitation.';
  end if;

  select lower(au.email), au.email_confirmed_at
    into v_user_email, v_email_confirmed_at
  from auth.users au
  where au.id = v_user_id;

  if v_user_email is null or v_email_confirmed_at is null then
    raise exception 'Confirm the invited email address before accepting this invitation.';
  end if;

  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'This invitation is invalid or has expired.';
  end if;

  select wi.* into v_invitation
  from public.workspace_invitations wi
  where wi.id = p_invitation_id
    and wi.token_hash = p_token_hash
  for update;

  if not found
     or v_invitation.email <> v_user_email
     or v_invitation.accepted_at is not null
     or v_invitation.revoked_at is not null
     or v_invitation.expires_at <= now() then
    raise exception 'This invitation is invalid, expired, or was sent to a different email address.';
  end if;

  insert into public.workspace_members(workspace_id, user_id, role)
  values (v_invitation.workspace_id, v_user_id, v_invitation.role);

  update public.workspace_invitations
  set accepted_at = now(), accepted_by = v_user_id
  where id = v_invitation.id;

  return v_invitation.workspace_id;
exception
  when unique_violation then
    raise exception 'This account is already a member of the workspace.';
end;
$function$;

revoke all on function public.accept_workspace_invitation(uuid, text) from public, anon;
grant execute on function public.accept_workspace_invitation(uuid, text) to authenticated;
