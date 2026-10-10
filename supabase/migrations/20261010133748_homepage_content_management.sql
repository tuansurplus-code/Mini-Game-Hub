create table public.homepage_content (
  id boolean primary key default true check (id = true),
  draft jsonb not null,
  published jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.homepage_content enable row level security;
revoke all on public.homepage_content from anon, authenticated;
grant select, insert, update on public.homepage_content to service_role;

insert into public.homepage_content (id, draft, published)
values (true, '{"version":1}'::jsonb, '{"version":1}'::jsonb)
on conflict (id) do nothing;
