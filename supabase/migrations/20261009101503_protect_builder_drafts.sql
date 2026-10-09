-- Builder drafts stay private until the owner explicitly publishes them.
-- Preserve automatic start/end transitions for published scheduled/active campaigns.
create or replace function public.sync_automatic_campaign_statuses()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  updated_count integer;
begin
  update public.campaigns
  set
    status = case
      when starts_at is null then status
      when now() < starts_at then 'scheduled'
      when ends_at is not null and now() >= ends_at then 'ended'
      else 'active'
    end,
    updated_at = now()
  where scheduling_mode = 'automatic'
    and status not in ('draft', 'archived', 'paused', 'ended')
    and status is distinct from case
      when starts_at is null then status
      when now() < starts_at then 'scheduled'
      when ends_at is not null and now() >= ends_at then 'ended'
      else 'active'
    end;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$function$;
