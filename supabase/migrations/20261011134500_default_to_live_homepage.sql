update public.homepage_content
set manager = jsonb_set(manager, '{defaultPageId}', 'null'::jsonb, true),
    published_manager = jsonb_set(published_manager, '{defaultPageId}', 'null'::jsonb, true)
where id = true
  and manager->>'defaultPageId' = manager->>'livePageId';
