import { NextResponse } from "next/server";
import { DEFAULT_HOMEPAGE_CONTENT, normalizeHomepageContent, normalizeHomepageManager } from "../../../../lib/homepage-content";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const db = createSupabaseAdminClient();
    const [{ data, error }, { data: drafts, error: draftError }, { data: activeGames, error: gamesError }, { data: plans, error: plansError }] = await Promise.all([
      db.from("homepage_content").select("published,published_manager").eq("id", true).maybeSingle(),
      db.from("homepage_drafts").select("id,name,kind,published_content,published_starts_at,published_ends_at,published_scheduled,published,created_at,updated_at"),
      db.from("platform_game_templates").select("game_type").eq("active", true),
      db.from("subscription_plans").select("id,slug,name,description,monthly_price_lkr,max_active_campaigns,max_monthly_participants,max_team_members").eq("active", true).order("sort_order"),
    ]);
    if (error) throw error;
    if (draftError) throw draftError;
    if (gamesError) throw gamesError;
    const manager = normalizeHomepageManager({ ...(data?.published_manager ?? {}), pages: (drafts ?? []).map(row => ({ id: row.id, name: row.name, kind: row.kind, content: row.published_content, startsAt: row.published_starts_at ?? "", endsAt: row.published_ends_at ?? "", scheduled: row.published_scheduled, published: row.published && row.published_content != null, createdAt: row.created_at, updatedAt: row.updated_at })) });
    const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const part = (type: string) => parts.find(item => item.type === type)?.value ?? "";
    const today = `${part("year")}-${part("month")}-${part("day")}`;
    const latestScheduled = manager.pages.filter(page => page.published && page.scheduled && page.startsAt && page.startsAt <= today).sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0];
    const active = latestScheduled && (!latestScheduled.endsAt || today <= latestScheduled.endsAt) ? latestScheduled : null;
    const page = active ?? manager.pages.find(item => item.published && item.id === manager.defaultPageId) ?? manager.pages.find(item => item.published && item.id === manager.livePageId);
    const content = normalizeHomepageContent(page?.content ?? null);
    const activeGameTypes = new Set((activeGames ?? []).map(row => row.game_type));
    content.games.cards = content.games.cards.filter(card => activeGameTypes.has(card.id));
    if (plansError) console.error("Unable to load public pricing", plansError);
    return NextResponse.json({ content, plans: plansError ? [] : plans ?? [], siteTheme: manager.siteTheme, pageName: page?.name ?? "Homepage", pageKind: page?.kind ?? "custom", analytics: manager.analytics }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Unable to load published homepage content", error);
    return NextResponse.json({ content: { ...DEFAULT_HOMEPAGE_CONTENT, games: { ...DEFAULT_HOMEPAGE_CONTENT.games, cards: [] } }, pageName: "Homepage", pageKind: "custom" }, { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
