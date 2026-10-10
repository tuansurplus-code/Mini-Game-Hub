create or replace function public.sync_automatic_campaign_statuses()
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_campaign record; v_next_status text; updated_count integer:=0;
begin
  for v_campaign in select id,starts_at,ends_at,status from public.campaigns
    where scheduling_mode='automatic' and status not in ('draft','archived','paused','ended')
    order by starts_at nulls first,id
  loop
    v_next_status:=case when v_campaign.starts_at is null then v_campaign.status
      when now()<v_campaign.starts_at then 'scheduled'
      when v_campaign.ends_at is not null and now()>=v_campaign.ends_at then 'ended'
      else 'active' end;
    if v_next_status is distinct from v_campaign.status then
      begin
        update public.campaigns set status=v_next_status,updated_at=now() where id=v_campaign.id;
        updated_count:=updated_count+1;
      exception when raise_exception then
        if sqlerrm not like 'Your plan has reached its active campaign limit.%' then raise; end if;
      end;
    end if;
  end loop;
  return updated_count;
end; $$;
