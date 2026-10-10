import { NextResponse } from "next/server";
import { getPlatformAdmin } from "../../../../lib/platform-auth";
import { normalizeHomepageContent } from "../../../../lib/homepage-content";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  const actor = await getPlatformAdmin();
  if (!actor) return reply({ error: "Platform access required." }, 403);
  const { data, error } = await createSupabaseAdminClient().from("homepage_content")
    .select("draft,published,updated_at,published_at").eq("id", true).maybeSingle();
  if (error) return reply({ error: "Unable to load homepage settings." }, 500);
  return reply({
    draft: normalizeHomepageContent(data?.draft),
    published: normalizeHomepageContent(data?.published),
    updatedAt: data?.updated_at ?? null,
    publishedAt: data?.published_at ?? null,
    canEdit: actor.role === "owner" || actor.role === "admin",
  });
}

export async function PATCH(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "Invalid request origin." }, 403);
  const actor = await getPlatformAdmin();
  if (!actor || !["owner", "admin"].includes(actor.role)) return reply({ error: "Only Super Admins and Admins can change homepage settings." }, 403);
  let body: { content?: unknown; action?: unknown };
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
  const values: Record<string, unknown> = { draft: content, updated_by: actor.user.id, updated_at: now };
  if (body.action === "publish") {
    values.published = content;
    values.published_at = now;
  }
  const { error } = await createSupabaseAdminClient().from("homepage_content").upsert({ id: true, ...values }, { onConflict: "id" });
  if (error) {
    console.error("Unable to save homepage content", error);
    return reply({ error: "Unable to save homepage settings." }, 500);
  }
  return reply({ saved: true, action: body.action, updatedAt: now, publishedAt: body.action === "publish" ? now : null });
}
