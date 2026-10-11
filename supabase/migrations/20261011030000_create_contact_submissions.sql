create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  phone_number text not null check (char_length(btrim(phone_number)) between 7 and 30),
  email text not null check (char_length(btrim(email)) between 3 and 254),
  details text not null check (char_length(btrim(details)) between 1 and 5000),
  created_at timestamptz not null default now()
);

alter table public.contact_submissions enable row level security;
revoke all on public.contact_submissions from anon, authenticated;
grant select, insert on public.contact_submissions to service_role;
