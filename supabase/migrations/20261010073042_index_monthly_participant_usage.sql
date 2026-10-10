create index if not exists game_sessions_started_participant_idx on public.game_sessions(started_at, participant_id);
create index if not exists participants_mobile_campaign_idx on public.participants(mobile_e164, campaign_id);
