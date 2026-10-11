import { NextResponse } from "next/server";
import { getPlatformAdmin } from "../../../../lib/platform-auth";
import { DEFAULT_HOMEPAGE_CONTENT, normalizeHomepageContent, type HomepageContent } from "../../../../lib/homepage-content";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  const actor = await getPlatformAdmin();
  if (!actor) return reply({ error: "Platform access required." }, 403);
  const supabase = createSupabaseAdminClient();
  const [settingsResult, draftsResult] = await Promise.all([
    supabase.from("homepage_content").select("draft,published,updated_at,published_at").eq("id", true).maybeSingle(),
    supabase.from("homepage_drafts").select("id,name,content,created_at").order("created_at", { ascending: false }).limit(50),
  ]);
  if (settingsResult.error || draftsResult.error) return reply({ error: "Unable to load homepage settings and saved drafts." }, 500);
  return reply({
    draft: normalizeHomepageContent(settingsResult.data?.draft),
    published: normalizeHomepageContent(settingsResult.data?.published),
    drafts: (draftsResult.data ?? []).map((draft) => ({ ...draft, content: normalizeHomepageContent(draft.content) })),
    updatedAt: settingsResult.data?.updated_at ?? null,
    publishedAt: settingsResult.data?.published_at ?? null,
    canEdit: actor.role === "owner" || actor.role === "admin",
  });
}

export async function PATCH(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "Invalid request origin." }, 403);
  const actor = await getPlatformAdmin();
  if (!actor || !["owner", "admin"].includes(actor.role)) return reply({ error: "Only Super Admins and Admins can change homepage settings." }, 403);
  let body: { content?: unknown; action?: unknown; name?: unknown };
  try { body = await request.json(); } catch { return reply({ error: "Invalid request." }, 400); }
  if (body.action !== "save" && body.action !== "publish") return reply({ error: "Choose save draft or publish." }, 400);
  const content = normalizeHomepageContent(body.content);
  for (const theme of content.seasonalThemes) {
    const startsAt = Date.parse(`${theme.startsAt}T00:00:00Z`);
    const endsAt = Date.parse(`${theme.endsAt}T23:59:59Z`);
    if (!theme.name || !Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt < startsAt) {
      return reply({ error: `Check the name and date range for ${theme.name || "each seasonal theme"}.` }, 400);
    }
  }
  const now = new Date().toISOString();
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: readError } = await supabase.from("homepage_content")
    .select("published,published_at").eq("id", true).maybeSingle();
  if (readError) {
    console.error("Unable to read homepage content before saving", readError);
    return reply({ error: "Unable to save homepage settings." }, 500);
  }
  const published = body.action === "publish" ? content : existing?.published ?? DEFAULT_HOMEPAGE_CONTENT;
  const publishedAt = body.action === "publish" ? now : existing?.published_at ?? null;
  const { error } = await supabase.from("homepage_content").upsert({
    id: true,
    draft: content,
    published,
    published_at: publishedAt,
    updated_by: actor.user.id,
    updated_at: now,
  }, { onConflict: "id" });
  if (error) {
    console.error("Unable to save homepage content", error);
    return reply({ error: "Unable to save homepage settings." }, 500);
  }
  let savedDraft: { id: string; name: string; content: HomepageContent; created_at: string } | null = null;
  if (body.action === "save") {
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    if (!name) return reply({ error: "Add a name before saving this version." }, 400);
    const { data: saved, error: draftError } = await createSupabaseAdminClient().from("homepage_drafts")
      .insert({ name, content, created_by: actor.user.id })
      .select("id,name,content,created_at").single();
    if (draftError) {
      console.error("Unable to save homepage draft snapshot", draftError);
      return reply({ error: "Draft could not be added to the saved drafts list." }, 500);
    }
    savedDraft = saved ? { ...saved, content: normalizeHomepageContent(saved.content) } : null;
  }
  return reply({ saved: true, action: body.action, updatedAt: now, publishedAt: body.action === "publish" ? now : null, savedDraft });
}
