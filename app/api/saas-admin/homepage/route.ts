import { NextResponse } from "next/server";
import { getPlatformAdmin } from "../../../../lib/platform-auth";
import { normalizeHomepageContent, normalizeHomepageManager } from "../../../../lib/homepage-content";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const todayColombo = () => { const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()); const value = (key: string) => parts.find(item => item.type === key)?.value ?? ""; return `${value("year")}-${value("month")}-${value("day")}`; };

export async function GET() {
  const actor = await getPlatformAdmin();
  if (!actor) return reply({ error: "Platform access required." }, 403);
  const db = createSupabaseAdminClient();
  const [{ data, error }, { data: drafts, error: draftError }] = await Promise.all([
    db.from("homepage_content").select("draft,published,manager,published_manager,updated_at,published_at").eq("id", true).maybeSingle(),
    db.from("homepage_drafts").select("id,name,kind,content,starts_at,ends_at,scheduled,published,published_content,published_starts_at,published_ends_at,published_scheduled,created_at,updated_at").order("updated_at", { ascending: false }),
  ]);
  if (error) return reply({ error: "Unable to load homepage settings." }, 500);
  if (draftError) return reply({ error: "Unable to load saved pages. Apply the homepage manager migration first." }, 500);
  const manager = normalizeHomepageManager({ ...(data?.manager ?? {}), pages: (drafts ?? []).map(row => ({ id: row.id, name: row.name, kind: row.kind, content: row.content, startsAt: row.starts_at ?? "", endsAt: row.ends_at ?? "", scheduled: row.scheduled, published: row.published, createdAt: row.created_at, updatedAt: row.updated_at })) });
  const currentDay = todayColombo();
  const latestScheduled = (drafts ?? []).filter(row => row.published && row.published_scheduled && row.published_starts_at && row.published_starts_at <= currentDay).sort((a, b) => String(b.published_starts_at).localeCompare(String(a.published_starts_at)))[0];
  const activePublished = latestScheduled && (!latestScheduled.published_ends_at || currentDay <= latestScheduled.published_ends_at) ? latestScheduled : null;
  const liveManager = normalizeHomepageManager({ ...(data?.published_manager ?? {}), pages: (drafts ?? []).filter(row => row.published && row.published_content).map(row => ({ id: row.id, name: row.name, kind: row.kind, content: row.published_content, startsAt: row.published_starts_at ?? "", endsAt: row.published_ends_at ?? "", scheduled: row.published_scheduled, published: true })) });
  const livePageId = activePublished?.id ?? liveManager.defaultPageId ?? liveManager.livePageId;
  return reply({
    draft: normalizeHomepageContent(data?.draft),
    published: normalizeHomepageContent(data?.published),
    manager,
    livePageId,
    updatedAt: data?.updated_at ?? null,
    publishedAt: data?.published_at ?? null,
    canEdit: actor.role === "owner" || actor.role === "admin",
  });
}

export async function PATCH(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "Invalid request origin." }, 403);
  const actor = await getPlatformAdmin();
  if (!actor || !["owner", "admin"].includes(actor.role)) return reply({ error: "Only Super Admins and Admins can change homepage settings." }, 403);
  let body: { content?: unknown; manager?: unknown; action?: unknown; publishedPageId?: unknown };
  try { body = await request.json(); } catch { return reply({ error: "Invalid request." }, 400); }
  if (body.action !== "save" && body.action !== "publish") return reply({ error: "Choose save draft or publish." }, 400);
  const content = normalizeHomepageContent(body.content);
  const manager = normalizeHomepageManager(body.manager);
  for (const page of manager.pages) {
    const start = page.startsAt ? Date.parse(`${page.startsAt}T00:00:00Z`) : NaN;
    const end = page.endsAt ? Date.parse(`${page.endsAt}T23:59:59Z`) : NaN;
    if (page.scheduled && !Number.isFinite(start)) return reply({ error: `Choose a start date for ${page.name}.` }, 400);
    if (page.endsAt && (!Number.isFinite(end) || end < start)) return reply({ error: `Check the end date for ${page.name}.` }, 400);
  }
  for (const theme of content.seasonalThemes) {
    const startsAt = Date.parse(`${theme.startsAt}T00:00:00Z`);
    const endsAt = Date.parse(`${theme.endsAt}T23:59:59Z`);
    if (!theme.name || !Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt < startsAt) {
      return reply({ error: `Check the name and date range for ${theme.name || "each seasonal theme"}.` }, 400);
    }
  }
  const now = new Date().toISOString();
  const publishedPageId = typeof body.publishedPageId === "string" && manager.pages.some(page => page.id === body.publishedPageId) ? body.publishedPageId : null;
  if (body.action === "publish" && !publishedPageId) return reply({ error: "Save or choose a page before publishing." }, 400);
  const savedPages = manager.pages.map(page => {
    const publishingPage = body.action === "publish" && page.id === publishedPageId;
    return { id: page.id, name: page.name, kind: page.kind, content: page.content, starts_at: page.startsAt || null, ends_at: page.endsAt || null, scheduled: page.scheduled, published: page.published || publishingPage, ...(publishingPage ? { published_content: page.content, published_starts_at: page.startsAt || null, published_ends_at: page.endsAt || null, published_scheduled: page.scheduled } : {}), created_by: actor.user.id, updated_at: page.updatedAt };
  });
  if (savedPages.length) {
    const { error: draftsError } = await createSupabaseAdminClient().from("homepage_drafts").upsert(savedPages, { onConflict: "id" });
    if (draftsError) return reply({ error: "Unable to save page templates." }, 500);
  }
  const storedManager = { ...manager, pages: [] };
  const values: Record<string, unknown> = { draft: content, manager: storedManager, updated_by: actor.user.id, updated_at: now };
  if (body.action === "publish") {
    values.published = content;
    values.published_at = now;
    values.published_manager = storedManager;
  }
  const { error } = await createSupabaseAdminClient().from("homepage_content").upsert({ id: true, ...values }, { onConflict: "id" });
  if (error) {
    console.error("Unable to save homepage content", error);
    return reply({ error: "Unable to save homepage settings." }, 500);
  }
  return reply({ saved: true, action: body.action, updatedAt: now, publishedAt: body.action === "publish" ? now : null });
}

export async function DELETE(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "Invalid request origin." }, 403);
  const actor = await getPlatformAdmin();
  if (!actor || !["owner", "admin"].includes(actor.role)) return reply({ error: "Only Super Admins and Admins can delete saved pages." }, 403);
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return reply({ error: "Invalid page id." }, 400);
  const db = createSupabaseAdminClient();
  const { data: row } = await db.from("homepage_content").select("manager,published_manager").eq("id", true).maybeSingle();
  const storedManager = row?.manager && typeof row.manager === "object" ? row.manager as Record<string, unknown> : {};
  const liveManager = row?.published_manager && typeof row.published_manager === "object" ? row.published_manager as Record<string, unknown> : {};
  const { data: scheduleRows } = await db.from("homepage_drafts").select("id,published_scheduled,published_starts_at,published_ends_at,published");
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? "";
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  const latestScheduled = (scheduleRows ?? []).filter(page => page.published && page.published_scheduled && page.published_starts_at && page.published_starts_at <= today).sort((a, b) => String(b.published_starts_at).localeCompare(String(a.published_starts_at)))[0];
  const isScheduledLive = latestScheduled?.id === id && (!latestScheduled.published_ends_at || today <= latestScheduled.published_ends_at);
  const defaultLiveId = liveManager.defaultPageId ?? liveManager.livePageId;
  if (defaultLiveId === id || isScheduledLive) return reply({ error: "Publish another page before deleting the live page." }, 409);
  const { error } = await db.from("homepage_drafts").delete().eq("id", id);
  if (error) return reply({ error: "Unable to delete saved page." }, 500);
  const nextManager = { ...storedManager, defaultPageId: storedManager.defaultPageId === id ? null : storedManager.defaultPageId, pages: [] };
  const nextLiveManager = { ...liveManager, defaultPageId: liveManager.defaultPageId === id ? null : liveManager.defaultPageId, pages: [] };
  await db.from("homepage_content").update({ manager: nextManager, published_manager: nextLiveManager, updated_by: actor.user.id, updated_at: new Date().toISOString() }).eq("id", true);
  return reply({ deleted: true });
}
