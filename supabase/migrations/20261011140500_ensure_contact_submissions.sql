create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text check (name is null or char_length(btrim(name)) between 1 and 120),
  phone_number text check (phone_number is null or char_length(btrim(phone_number)) between 7 and 30),
  email text check (email is null or (char_length(btrim(email)) between 3 and 254 and position('@' in email) > 1)),
  details text check (details is null or char_length(btrim(details)) between 1 and 5000),
  created_at timestamptz not null default now(),
  responses jsonb not null default '[]'::jsonb
);

alter table public.contact_submissions add column if not exists responses jsonb not null default '[]'::jsonb;
create index if not exists contact_submissions_created_at_idx on public.contact_submissions (created_at desc);
alter table public.contact_submissions enable row level security;
revoke all on public.contact_submissions from anon, authenticated;
grant select, insert on public.contact_submissions to service_role;
