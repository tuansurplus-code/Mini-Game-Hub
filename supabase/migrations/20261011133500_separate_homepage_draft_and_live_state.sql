alter table public.homepage_content
  add column if not exists published_manager jsonb not null default '{"pages":[],"livePageId":null,"defaultPageId":null,"siteTheme":{"preset":"clean-white","colors":{"primary":"#e31b23","accent":"#ff5b61","heroBackground":"#101828","pageBackground":"#f6f7f9","cardBackground":"#ffffff","footerBackground":"#101828"},"fonts":{"header":"Arial, sans-serif","body":"Arial, sans-serif","footer":"Arial, sans-serif"}}}'::jsonb;

alter table public.homepage_drafts add column if not exists published_content jsonb;
alter table public.homepage_drafts add column if not exists published_starts_at date;
alter table public.homepage_drafts add column if not exists published_ends_at date;
alter table public.homepage_drafts add column if not exists published_scheduled boolean not null default false;

update public.homepage_drafts
set published_content = content,
    published_starts_at = starts_at,
    published_ends_at = ends_at,
    published_scheduled = scheduled
where published = true and published_content is null;

update public.homepage_content
set published_manager = manager
where id = true and published_manager->>'livePageId' is null
  and manager->>'livePageId' is not null;
