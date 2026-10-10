create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  name text not null,
  description text not null default '',
  monthly_price_lkr numeric(12,2) check (monthly_price_lkr is null or monthly_price_lkr >= 0),
  max_active_campaigns integer check (max_active_campaigns is null or max_active_campaigns > 0),
  max_monthly_participants integer check (max_monthly_participants is null or max_monthly_participants > 0),
  max_team_members integer check (max_team_members is null or max_team_members > 0),
  feature_flags jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_subscriptions (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id) on delete restrict,
  status text not null check (status in ('active','past_due','expired','cancelled','suspended','grandfathered')),
  period_start timestamptz,
  period_end timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end is null or period_start is null or period_end > period_start)
);

create table if not exists public.subscription_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  requested_plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  requested_by uuid not null references auth.users(id) on delete restrict,
  amount_lkr numeric(12,2) not null check (amount_lkr >= 0),
  billing_period_months smallint not null default 1 check (billing_period_months = 1),
  payment_reference text not null check (length(payment_reference) between 1 and 120),
  receipt_path text not null unique,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  review_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists subscription_requests_workspace_created_idx
  on public.subscription_requests(workspace_id, created_at desc);
create index if not exists subscription_requests_status_created_idx
  on public.subscription_requests(status, created_at desc);
create unique index if not exists subscription_requests_one_pending_per_workspace
  on public.subscription_requests(workspace_id) where status = 'pending';

alter table public.subscription_plans enable row level security;
alter table public.workspace_subscriptions enable row level security;
alter table public.subscription_requests enable row level security;

drop policy if exists "authenticated users can view active subscription plans" on public.subscription_plans;
create policy "authenticated users can view active subscription plans"
  on public.subscription_plans for select to authenticated
  using (active or private.is_platform_admin());

drop policy if exists "platform admins manage subscription plans" on public.subscription_plans;
create policy "platform admins manage subscription plans"
  on public.subscription_plans for all to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

drop policy if exists "workspace members can view subscriptions" on public.workspace_subscriptions;
create policy "workspace members can view subscriptions"
  on public.workspace_subscriptions for select to authenticated
  using (private.is_workspace_reader(workspace_id) or private.is_platform_admin());

drop policy if exists "platform admins manage subscriptions" on public.workspace_subscriptions;
create policy "platform admins manage subscriptions"
  on public.workspace_subscriptions for all to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

drop policy if exists "workspace owners and platform admins can view subscription requests" on public.subscription_requests;
create policy "workspace owners and platform admins can view subscription requests"
  on public.subscription_requests for select to authenticated
  using (private.is_workspace_owner(workspace_id) or private.is_platform_admin());

drop policy if exists "workspace owners can submit subscription requests" on public.subscription_requests;
create policy "workspace owners can submit subscription requests"
  on public.subscription_requests for insert to authenticated
  with check (private.is_workspace_owner(workspace_id) and requested_by = (select auth.uid()) and status = 'pending');

drop policy if exists "platform admins can review subscription requests" on public.subscription_requests;
create policy "platform admins can review subscription requests"
  on public.subscription_requests for update to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

insert into public.subscription_plans
  (slug,name,description,monthly_price_lkr,max_active_campaigns,max_monthly_participants,max_team_members,feature_flags,sort_order)
values
  ('free','Free','For trying Mini-Game Hub',0,1,500,null,
   '{"custom_branding":false,"automatic_scheduling":true,"advanced_reports":false}'::jsonb,10),
  ('basic','Basic','For growing campaigns',null,5,5000,null,
   '{"custom_branding":true,"automatic_scheduling":true,"advanced_reports":true}'::jsonb,20),
  ('pro','Pro','For advanced usage',null,20,25000,null,
   '{"custom_branding":true,"automatic_scheduling":true,"advanced_reports":true}'::jsonb,30),
  ('enterprise','Enterprise','Custom limits and pricing',null,null,null,null,
   '{"custom_branding":true,"automatic_scheduling":true,"advanced_reports":true}'::jsonb,40)
on conflict (slug) do nothing;

insert into public.workspace_subscriptions(workspace_id,plan_id,status)
select w.id, null, 'grandfathered'
from public.workspaces w
on conflict (workspace_id) do nothing;

create or replace function private.assign_free_workspace_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  free_plan_id uuid;
begin
  if auth.uid() is not null and auth.uid() <> new.owner_user_id
     and not private.is_platform_admin() then
    raise exception 'Not allowed to initialize subscription for this workspace';
  end if;

  select id into free_plan_id
  from public.subscription_plans
  where slug = 'free' and active = true
  limit 1;

  if free_plan_id is null then
    raise exception 'Free plan is not configured';
  end if;

  insert into public.workspace_subscriptions(workspace_id,plan_id,status,period_start)
  values (new.id,free_plan_id,'active',now())
  on conflict (workspace_id) do nothing;

  return new;
end;
$function$;

drop trigger if exists assign_free_workspace_subscription on public.workspaces;
create trigger assign_free_workspace_subscription
  after insert on public.workspaces
  for each row execute function private.assign_free_workspace_subscription();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('subscription-receipts','subscription-receipts',false,5242880,array['application/pdf','image/png','image/jpeg'])
on conflict (id) do update
set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
