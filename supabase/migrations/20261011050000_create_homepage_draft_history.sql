create table if not exists public.homepage_drafts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  content jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.homepage_drafts enable row level security;
revoke all on public.homepage_drafts from anon, authenticated;
grant select, insert on public.homepage_drafts to service_role;

insert into public.homepage_drafts (name, content, created_by, created_at)
select
  'Existing homepage draft',
  draft,
  updated_by,
  coalesce(updated_at, now())
from public.homepage_content
where id = true
  and draft is not null;
