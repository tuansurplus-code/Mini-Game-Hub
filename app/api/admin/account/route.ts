import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

export async function PATCH(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const { workspaceId, role, user } = await requireAdmin();
  if (role !== "owner") {
    return NextResponse.json({ error: "Only the workspace owner can edit the business profile." }, { status: 403 });
  }
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body || typeof body.name !== "string" || typeof body.logo_url !== "string" || typeof body.brand_color !== "string") {
    return NextResponse.json({ error: "Invalid business profile." }, { status: 400 });
  }
  const name = body.name.trim();
  const logoUrl = body.logo_url.trim();
  if (!name || name.length > 100 || logoUrl.length > 2048 || !/^#[0-9a-f]{6}$/i.test(body.brand_color)) {
    return NextResponse.json({ error: "Enter a business name (up to 100 characters) and a valid brand color." }, { status: 400 });
  }
  if (logoUrl) {
    try { const url = new URL(logoUrl); if (url.protocol !== "https:" || url.username || url.password) throw new Error(); }
    catch { return NextResponse.json({ error: "Logo URL must be a valid HTTPS address." }, { status: 400 }); }
  }
  const s = await createSupabaseServerClient();
  const { data: workspace, error: loadError } = await s.from("workspaces")
    .select("settings").eq("id", workspaceId).eq("owner_user_id", user.id).single();
  if (loadError || !workspace) return NextResponse.json({ error: "Unable to load your workspace." }, { status: 403 });
  const { data, error } = await s.from("workspaces").update({ name,
    settings: { ...workspace.settings, business_profile: { logo_url: logoUrl || null, brand_color: body.brand_color } },
  }).eq("id", workspaceId).eq("owner_user_id", user.id).select("id").single();
  if (error || !data) return NextResponse.json({ error: "Unable to save the business profile. Please try again." }, { status: 400 });
  return NextResponse.json({ saved: true });
}
