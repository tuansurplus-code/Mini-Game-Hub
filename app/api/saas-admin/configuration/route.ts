import { NextResponse } from "next/server";
import { getPlatformAdmin } from "../../../../lib/platform-auth";
import { normalizeHomepageManager, type HomepageAnalyticsSettings } from "../../../../lib/homepage-content";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const containerPattern = /^GTM-[A-Z0-9]+$/;

export async function GET() {
  const actor = await getPlatformAdmin();
  if (!actor) return reply({ error: "Platform access required." }, 403);
  const db = createSupabaseAdminClient();
  const { data, error } = await db.from("homepage_content").select("manager").eq("id", true).maybeSingle();
  if (error) return reply({ error: "Unable to load website configuration." }, 500);
  const manager = normalizeHomepageManager(data?.manager ?? {});
  return reply({ analytics: manager.analytics, canEdit: actor.role === "owner" || actor.role === "admin" });
}

export async function PATCH(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "Invalid request origin." }, 403);
  const actor = await getPlatformAdmin();
  if (!actor || !["owner", "admin"].includes(actor.role)) return reply({ error: "Only Super Admins and Admins can update website configuration." }, 403);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return reply({ error: "Invalid request." }, 400); }
  const enabled = body.gtmEnabled === true;
  const rawId = typeof body.gtmContainerId === "string" ? body.gtmContainerId.trim().toUpperCase() : "";
  if ((enabled && !rawId) || (rawId && !containerPattern.test(rawId))) return reply({ error: "Enter a valid GTM container ID, such as GTM-ABC1234, or clear the field." }, 400);
  const analytics: HomepageAnalyticsSettings = { gtmEnabled: enabled, gtmContainerId: rawId };
  const db = createSupabaseAdminClient();
  const { data: current, error: readError } = await db.from("homepage_content").select("manager,published_manager").eq("id", true).maybeSingle();
  if (readError || !current) return reply({ error: "Homepage settings could not be found." }, 500);
  const manager = current.manager && typeof current.manager === "object" ? current.manager as Record<string, unknown> : {};
  const publishedManager = current.published_manager && typeof current.published_manager === "object" ? current.published_manager as Record<string, unknown> : {};
  const { error } = await db.from("homepage_content").update({
    manager: { ...manager, analytics },
    published_manager: { ...publishedManager, analytics },
    updated_by: actor.user.id,
    updated_at: new Date().toISOString(),
  }).eq("id", true);
  if (error) return reply({ error: "Unable to save website configuration." }, 500);
  return reply({ saved: true, analytics });
}
