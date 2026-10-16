-- Run after enforcement. Every fixture and change is rolled back.
begin;
do $$
declare test_user uuid:=gen_random_uuid();test_workspace uuid:=gen_random_uuid();
begin
 if has_function_privilege('anon','public.play_spin(uuid,text,uuid)','execute') or has_function_privilege('authenticated','public.play_spin(uuid,text,uuid)','execute') then raise exception 'Direct play remains exposed';end if;
 if has_function_privilege('anon','public.claim_prize(uuid,uuid,text,text,text,text)','execute') then raise exception 'Direct claim remains exposed';end if;
 if has_function_privilege('anon','public.consume_request_rate_limit(text,integer,integer)','execute') then raise exception 'Rate limiter is public';end if;
 if has_table_privilege('anon','public.prizes','select') then raise exception 'Raw prizes remain public';end if;
 if exists(select 1 from public.campaign_games cg cross join lateral public.get_public_game_prizes(cg.id) p where p.metadata-'segment_color'<>'{}'::jsonb) then raise exception 'Sensitive prize metadata exposed';end if;
 insert into auth.users(id,email,raw_app_meta_data)values(test_user,'security-test-'||test_user||'@example.invalid','{}'::jsonb);
 insert into public.platform_admins(user_id,role,active,full_name,contact_number)values(test_user,'support',true,'Temporary rollback-only security fixture','0000000000');
 perform set_config('request.jwt.claim.sub',test_user::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',test_user,'role','authenticated','aal','aal2')::text,true);
 if private.can_manage_game_templates()then raise exception 'Support can edit templates';end if;
 if not private.can_review_subscriptions()then raise exception 'Verified support cannot read reports';end if;
 update public.platform_admins set role='owner'where user_id=test_user;
 if not private.can_manage_game_templates()then raise exception 'Verified owner cannot edit templates';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',test_user,'role','authenticated','aal','aal1')::text,true);
 if private.is_platform_admin()or private.can_manage_billing()or private.can_manage_game_templates()then raise exception 'MFA can be bypassed';end if;
 insert into public.workspaces(id,name,slug,owner_user_id,status,settings)values(test_workspace,'Temporary security fixture','security-test-'||test_workspace,test_user,'active','{}'::jsonb);
 insert into public.workspace_members(workspace_id,user_id,role)values(test_workspace,test_user,'owner');
 if not private.is_workspace_editor(test_workspace)then raise exception 'Active workspace edit denied';end if;
 update public.workspaces set status='suspended'where id=test_workspace;
 if private.is_workspace_editor(test_workspace)or private.is_workspace_owner(test_workspace)or private.is_workspace_reader(test_workspace)or private.is_workspace_member(test_workspace)then raise exception 'Suspended workspace access allowed';end if;
 update public.workspaces set status='active'where id=test_workspace;
 update auth.users set raw_app_meta_data='{"must_change_password":true}'::jsonb where id=test_user;
 if private.is_workspace_editor(test_workspace)then raise exception 'Temporary password setup bypassed';end if;
end $$;
select 'Security regression checks passed; fixture changes rolled back.' as result;
rollback;
