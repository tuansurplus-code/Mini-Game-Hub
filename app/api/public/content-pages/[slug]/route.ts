import { NextResponse } from "next/server";
import { normalizeHomepageManager } from "../../../../../lib/homepage-content";
import { createSupabaseAdminClient } from "../../../../../lib/supabase-admin";
import { sanitizeRichText } from "../../../../../lib/rich-text";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!["terms", "privacy", "about", "contact"].includes(slug)) return NextResponse.json({ error: "Page not found." }, { status: 404 });
  const db = createSupabaseAdminClient();
  const [{ data: page, error }, { data: home }] = await Promise.all([
    db.from("content_pages").select("slug,title,published,published_at").eq("slug", slug).maybeSingle(),
    db.from("homepage_content").select("published_manager").eq("id", true).maybeSingle(),
  ]);
  if (error || !page) return NextResponse.json({ error: "Page not found." }, { status: 404 });
  const safePage = { ...page, published: { ...page.published, body: sanitizeRichText(page.published?.body ?? "") } };
  return NextResponse.json({ page: safePage, theme: normalizeHomepageManager(home?.published_manager).siteTheme }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
