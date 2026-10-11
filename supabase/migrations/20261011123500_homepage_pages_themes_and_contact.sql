alter table public.homepage_content
  add column if not exists manager jsonb not null default '{"pages":[],"livePageId":null,"defaultPageId":null,"siteTheme":{"preset":"clean-white","colors":{"primary":"#e31b23","accent":"#ff5b61","heroBackground":"#101828","pageBackground":"#f6f7f9","cardBackground":"#ffffff","footerBackground":"#101828"},"fonts":{"header":"Arial, sans-serif","body":"Arial, sans-serif","footer":"Arial, sans-serif"}}}'::jsonb;

create table if not exists public.content_pages (
  slug text primary key check (slug in ('terms', 'privacy', 'about', 'contact')),
  title text not null,
  draft jsonb not null default '{}'::jsonb,
  published jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.content_pages enable row level security;
revoke all on public.content_pages from anon, authenticated;
grant select, insert, update, delete on public.content_pages to service_role;

insert into public.content_pages (slug, title, draft, published)
values
  ('terms', 'Terms & Conditions', '{"body":""}'::jsonb, '{"body":""}'::jsonb),
  ('privacy', 'Privacy Policy', '{"body":""}'::jsonb, '{"body":""}'::jsonb),
  ('about', 'About Us', '{"body":""}'::jsonb, '{"body":""}'::jsonb),
  ('contact', 'Contact Us', '{"body":"","fields":[{"id":"name","label":"Name","type":"text","enabled":true,"required":true},{"id":"phone","label":"Phone number","type":"tel","enabled":true,"required":true},{"id":"email","label":"Email","type":"email","enabled":true,"required":true},{"id":"details","label":"Details","type":"textarea","enabled":true,"required":true}]}'::jsonb,
  '{"body":"","fields":[{"id":"name","label":"Name","type":"text","enabled":true,"required":true},{"id":"phone","label":"Phone number","type":"tel","enabled":true,"required":true},{"id":"email","label":"Email","type":"email","enabled":true,"required":true},{"id":"details","label":"Details","type":"textarea","enabled":true,"required":true}]}'::jsonb)
on conflict (slug) do nothing;

create table if not exists public.homepage_drafts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  content jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.homepage_drafts add column if not exists kind text not null default 'custom' check (kind in ('custom','wesak','christmas','ramadan','new-year'));
alter table public.homepage_drafts add column if not exists starts_at date;
alter table public.homepage_drafts add column if not exists ends_at date;
alter table public.homepage_drafts add column if not exists scheduled boolean not null default false;
alter table public.homepage_drafts add column if not exists published boolean not null default false;
alter table public.homepage_drafts add column if not exists updated_at timestamptz not null default now();
alter table public.homepage_drafts enable row level security;
revoke all on public.homepage_drafts from anon, authenticated;
grant select, insert, update, delete on public.homepage_drafts to service_role;
