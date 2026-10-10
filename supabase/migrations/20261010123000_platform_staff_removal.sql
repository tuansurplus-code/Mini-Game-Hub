alter table public.platform_staff_audit drop constraint if exists platform_staff_audit_action_check;
alter table public.platform_staff_audit add constraint platform_staff_audit_action_check check (action in ('create','update','delete'));

create or replace function public.remove_platform_staff(p_actor uuid, p_target uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_before jsonb;
begin
  lock table public.platform_admins in share row exclusive mode;
  if not exists (
    select 1 from public.platform_admins pa join auth.users u on u.id=pa.user_id
    where pa.user_id=p_actor and pa.role='owner' and pa.active
      and coalesce(u.raw_app_meta_data->>'must_change_password','false') <> 'true'
  ) then raise exception 'Only active Super Admins can manage staff.'; end if;
  if p_target is null or p_target=p_actor then raise exception 'You cannot remove your own Super Admin access.'; end if;
  select to_jsonb(pa) into v_before from public.platform_admins pa where user_id=p_target;
  if v_before is null then raise exception 'Staff account not found.'; end if;
  if v_before->>'role'='owner' and (v_before->>'active')::boolean
     and not exists (select 1 from public.platform_admins where role='owner' and active and user_id<>p_target) then
    raise exception 'The last active Super Admin cannot be removed.';
  end if;
  delete from public.platform_admins where user_id=p_target;
  insert into public.platform_staff_audit(actor_id,target_id,action,before_state,after_state)
    values(p_actor,p_target,'delete',v_before,jsonb_build_object('role',v_before->>'role','active',false,'removed',true));
end;
$$;
revoke all on function public.remove_platform_staff(uuid,uuid) from public, anon, authenticated;
grant execute on function public.remove_platform_staff(uuid,uuid) to service_role;
