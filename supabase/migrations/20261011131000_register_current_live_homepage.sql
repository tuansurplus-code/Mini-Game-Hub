with current_live as (
  insert into public.homepage_drafts (name, kind, content, published, created_by, updated_at)
  select 'Current live homepage', 'custom', homepage_content.published, true, homepage_content.updated_by, now()
  from public.homepage_content
  where homepage_content.id = true
    and not exists (select 1 from public.homepage_drafts where published = true)
  returning id
)
update public.homepage_content as homepage_content
set manager = coalesce(homepage_content.manager, '{}'::jsonb) || jsonb_build_object(
  'livePageId', current_live.id::text,
  'defaultPageId', coalesce(nullif(homepage_content.manager->>'defaultPageId', ''), current_live.id::text),
  'pages', '[]'::jsonb
)
from current_live
where homepage_content.id = true;
