import { NextResponse } from "next/server";
import { getPlatformAdmin } from "../../../../lib/platform-auth";
import { normalizeHomepageManager } from "../../../../lib/homepage-content";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";
import { sanitizeRichText } from "../../../../lib/rich-text";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const slugs = ["terms", "privacy", "about", "contact"] as const;
type Slug = typeof slugs[number];
type FormField = { id: string; label: string; type: "text" | "tel" | "email" | "textarea"; enabled: boolean; required: boolean };

export async function GET() {
  const actor = await getPlatformAdmin();
  if (!actor) return json({ error: "Platform access required." }, 403);
  const db = createSupabaseAdminClient();
  const [{ data, error }, { data: home }] = await Promise.all([
    db.from("content_pages").select("slug,title,draft,published,updated_at,published_at").order("slug"),
    db.from("homepage_content").select("manager").eq("id", true).maybeSingle(),
  ]);
  if (error) return json({ error: "Unable to load content pages." }, 500);
  const pages = (data ?? []).map((page) => ({ ...page, draft: { ...page.draft, body: sanitizeRichText(page.draft?.body ?? "") }, published: { ...page.published, body: sanitizeRichText(page.published?.body ?? "") } }));
  return json({ pages, theme: normalizeHomepageManager(home?.manager).siteTheme, canEdit: ["owner", "admin"].includes(actor.role) });
}

export async function PATCH(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Invalid request origin." }, 403);
  const actor = await getPlatformAdmin();
  if (!actor || !["owner", "admin"].includes(actor.role)) return json({ error: "Only Super Admins and Admins can edit content pages." }, 403);
  let body: { slug?: unknown; title?: unknown; action?: unknown; content?: unknown };
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  if (!slugs.includes(body.slug as Slug) || !["save", "publish"].includes(body.action as string)) return json({ error: "Choose a valid page and save action." }, 400);
  const slug = body.slug as Slug;
  const content = body.content && typeof body.content === "object" ? body.content as Record<string, unknown> : {};
  const cleanText = (v: unknown, limit: number) => typeof v === "string" ? v.slice(0, limit) : "";
  const pageContent: { body: string; fields?: FormField[] } = { body: sanitizeRichText(cleanText(content.body, 100000)) };
  if (slug === "contact") {
    const fields = Array.isArray(content.fields) ? content.fields.slice(0, 20) : [];
    const ids = new Set<string>();
    pageContent.fields = fields.flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const field = raw as Partial<FormField>;
      const id = cleanText(field.id, 40).toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (!id || ids.has(id)) return [];
      ids.add(id);
      return [{ id, label: cleanText(field.label, 80) || id, type: ["text", "tel", "email", "textarea"].includes(field.type ?? "") ? field.type! : "text", enabled: field.enabled === true, required: field.required === true }];
    });
    if (!pageContent.fields.some((field) => field.enabled)) return json({ error: "Enable at least one contact field." }, 400);
  }
  const now = new Date().toISOString();
  const values: Record<string, unknown> = { slug, title: cleanText(body.title, 100) || slug, draft: pageContent, updated_by: actor.user.id, updated_at: now };
  if (body.action === "publish") { values.published = pageContent; values.published_at = now; }
  const { error } = await createSupabaseAdminClient().from("content_pages").upsert(values, { onConflict: "slug" });
  if (error) { console.error("Unable to save content page", error); return json({ error: "Unable to save content page." }, 500); }
  return json({ saved: true, updatedAt: now, publishedAt: body.action === "publish" ? now : null });
}
