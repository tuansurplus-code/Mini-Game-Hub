import { NextResponse } from "next/server";
import { normalizeHomepageContent, normalizeHomepageManager } from "../../../../lib/homepage-content";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const db = createSupabaseAdminClient();
    const [{ data, error }, { data: drafts, error: draftError }] = await Promise.all([
      db.from("homepage_content").select("published,published_manager").eq("id", true).maybeSingle(),
      db.from("homepage_drafts").select("id,name,kind,published_content,published_starts_at,published_ends_at,published_scheduled,published,created_at,updated_at"),
    ]);
    if (error) throw error;
    if (draftError) throw draftError;
    const manager = normalizeHomepageManager({ ...(data?.published_manager ?? {}), pages: (drafts ?? []).map(row => ({ id: row.id, name: row.name, kind: row.kind, content: row.published_content, startsAt: row.published_starts_at ?? "", endsAt: row.published_ends_at ?? "", scheduled: row.published_scheduled, published: row.published && row.published_content != null, createdAt: row.created_at, updatedAt: row.updated_at })) });
    const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const part = (type: string) => parts.find(item => item.type === type)?.value ?? "";
    const today = `${part("year")}-${part("month")}-${part("day")}`;
    const latestScheduled = manager.pages.filter(page => page.published && page.scheduled && page.startsAt && page.startsAt <= today).sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0];
    const active = latestScheduled && (!latestScheduled.endsAt || today <= latestScheduled.endsAt) ? latestScheduled : null;
    const page = active ?? manager.pages.find(item => item.published && item.id === manager.defaultPageId) ?? manager.pages.find(item => item.published && item.id === manager.livePageId);
    const content = normalizeHomepageContent(page?.content ?? data?.published);
    const { fonts } = manager.siteTheme;
    content.typography.header.fontFamily = fonts.header;
    content.typography.footer.fontFamily = fonts.footer;
    content.typography.hero.fontFamily = fonts.body;
    content.typography.games.fontFamily = fonts.body;
    content.typography.how.fontFamily = fonts.body;
    return NextResponse.json({ content, pageName: page?.name ?? "Homepage", pageKind: page?.kind ?? "custom" }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Unable to load published homepage content", error);
    return NextResponse.json({ content: null }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
