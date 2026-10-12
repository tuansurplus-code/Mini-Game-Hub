create table if not exists public.platform_game_templates (
  game_type text primary key check (game_type in ('spin','scratch','pick-card')),
  name text not null,
  description text not null default '',
  active boolean not null default true,
  feature_flags jsonb not null default '{"text":true,"colors":true,"styles":true,"advanced":true,"branding":true}'::jsonb,
  default_appearance jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.platform_game_templates enable row level security;
grant select, insert, update on public.platform_game_templates to authenticated;
drop policy if exists "authenticated users can read active game templates" on public.platform_game_templates;
create policy "authenticated users can read active game templates"
  on public.platform_game_templates for select to authenticated
  using (active or private.is_platform_admin());
drop policy if exists "platform admins manage game templates" on public.platform_game_templates;
create policy "platform admins manage game templates" on public.platform_game_templates for all to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());

insert into public.platform_game_templates (game_type,name,description,active,feature_flags,default_appearance)
values
('spin','Spin & Win','Spin the wheel to reveal a campaign reward.',true,'{"text":true,"colors":true,"styles":true,"advanced":true,"branding":true}'::jsonb,'{"title":"SPIN & WIN","subtitle":"Spin daily and win exciting rewards!","button_text":"SPIN NOW","page_background_color":"#ffffff","button_color":"#e31b23","button_text_color":"#ffffff","wheel_style":"classic","wheel_theme":"multicolor","segment_sizing":"equal","min_visual_segments":8,"wheel_border_color":"#111827","wheel_border_thickness":8,"center_color":"#e31b23","center_size":50,"pointer_color":"#e31b23","prize_text_color":"#ffffff","prize_text_size":13,"text_orientation":"auto","animation_duration":5.2}'::jsonb),
('scratch','Scratch & Win','Reveal a reward by scratching the game card.',true,'{"text":true,"colors":true,"styles":true,"advanced":true,"branding":true}'::jsonb,'{"title":"SCRATCH & WIN","subtitle":"Scratch the card to reveal your result!","button_text":"START SCRATCHING","page_background_color":"#f8fafc","button_color":"#e31b23","button_text_color":"#ffffff","scratch_style":"classic","scratch_cover_color":"#6b7280","scratch_cover_alt_color":"#9ca3af","scratch_card_background":"#fff7ed","scratch_card_border_color":"#111827","scratch_card_border_thickness":5,"scratch_card_radius":22,"scratch_instruction":"SCRATCH HERE","scratch_reveal_percent":50}'::jsonb),
('pick-card','Pick a Card','Choose a card to reveal a campaign reward.',true,'{"text":true,"colors":true,"styles":true,"advanced":true,"branding":true}'::jsonb,'{"title":"PICK A CARD","subtitle":"Pick a card and reveal your reward!","button_text":"PICK NOW","page_background_color":"#f8fafc","button_color":"#0f766e","button_text_color":"#ffffff","card_theme":"modern","card_style":"diamond","card_back_color":"#0f766e","card_back_alt_color":"#0d9488","card_front_color":"#f0fdfa","card_border_color":"#115e59","card_radius":18,"card_count":4,"reveal_duration":0.6}'::jsonb)
on conflict (game_type) do nothing;

create table if not exists public.subscription_plan_game_permissions (
  plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  game_type text not null references public.platform_game_templates(game_type) on delete cascade,
  enabled boolean not null default true,
  allowed_customizations text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (plan_id,game_type),
  constraint subscription_plan_game_permissions_customizations_check
    check (allowed_customizations <@ array['text','colors','styles','advanced','branding']::text[])
);
alter table public.subscription_plan_game_permissions enable row level security;
grant select, insert, update, delete on public.subscription_plan_game_permissions to authenticated;
drop policy if exists "authenticated users can read game plan permissions" on public.subscription_plan_game_permissions;
create policy "authenticated users can read game plan permissions" on public.subscription_plan_game_permissions for select to authenticated using (true);
drop policy if exists "platform admins manage game plan permissions" on public.subscription_plan_game_permissions;
create policy "platform admins manage game plan permissions" on public.subscription_plan_game_permissions for all to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());

insert into public.subscription_plan_game_permissions (plan_id,game_type,enabled,allowed_customizations)
select p.id,t.game_type,true,case when coalesce((p.feature_flags->>'custom_branding')::boolean,false)
  then array['text','colors','styles','advanced','branding']::text[] else array['text','colors','styles','advanced']::text[] end
from public.subscription_plans p cross join public.platform_game_templates t
on conflict (plan_id,game_type) do nothing;
