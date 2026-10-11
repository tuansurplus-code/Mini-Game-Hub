create index if not exists content_pages_updated_by_idx
  on public.content_pages (updated_by)
  where updated_by is not null;

create index if not exists homepage_drafts_created_by_idx
  on public.homepage_drafts (created_by)
  where created_by is not null;
