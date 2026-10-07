import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../../../lib/supabase-server";

type RouteContext = { params: Promise<{ id: string }> };
const hexColor = /^#[0-9a-fA-F]{6}$/;
const alignments = new Set(["left", "center", "right"]);
const clamp = (value: unknown, min: number, max: number, fallback: number) => { const n = Number(value); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback; };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { workspaceId, role } = await requireAdmin();
    if (!["owner", "admin", "editor"].includes(role)) return NextResponse.json({ error: "You do not have permission to update campaign appearance." }, { status: 403 });
    const { id } = await params; const body = await request.json();
    const colorFields = ["background_color", "card_background_color", "button_color", "button_text_color", "title_color", "subtitle_color"] as const;
    for (const field of colorFields) if (!hexColor.test(String(body[field] ?? ""))) return NextResponse.json({ error: `Invalid color value for ${field}.` }, { status: 400 });
    const titleAlign = String(body.title_align ?? "center"); const subtitleAlign = String(body.subtitle_align ?? "center"); const logoAlign = String(body.logo_align ?? "center");
    if (![titleAlign, subtitleAlign, logoAlign].every(v => alignments.has(v))) return NextResponse.json({ error: "Invalid alignment value." }, { status: 400 });
    const logoUrl = String(body.logo_url ?? "").trim().slice(0, 1000);
    if (logoUrl) { try { const parsed = new URL(logoUrl); if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(); } catch { return NextResponse.json({ error: "Logo URL must be a valid http or https URL." }, { status: 400 }); } }

    const landing = {
      subtitle: String(body.subtitle ?? "").trim().slice(0, 500), background_color: body.background_color, card_background_color: body.card_background_color, button_color: body.button_color, button_text_color: body.button_text_color,
      title_bold: Boolean(body.title_bold), title_italic: Boolean(body.title_italic), title_underline: Boolean(body.title_underline), title_align: titleAlign, title_font_size: clamp(body.title_font_size, 18, 96, 54), title_color: body.title_color,
      subtitle_bold: Boolean(body.subtitle_bold), subtitle_italic: Boolean(body.subtitle_italic), subtitle_underline: Boolean(body.subtitle_underline), subtitle_align: subtitleAlign, subtitle_font_size: clamp(body.subtitle_font_size, 10, 48, 17), subtitle_color: body.subtitle_color,
      logo_url: logoUrl, logo_align: logoAlign, logo_width: clamp(body.logo_width, 40, 500, 160), logo_visible: Boolean(body.logo_visible),
    };
    const supabase = await createSupabaseServerClient();
    const { data: campaign, error: loadError } = await supabase.from("campaigns").select("id, settings").eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
    if (loadError) return NextResponse.json({ error: loadError.message }, { status: 400 }); if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    const currentSettings = campaign.settings && typeof campaign.settings === "object" && !Array.isArray(campaign.settings) ? campaign.settings as Record<string, unknown> : {};
    const settings = { ...currentSettings, landing };
    const { data: updated, error } = await supabase.from("campaigns").update({ settings, updated_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", workspaceId).select("id, settings").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 }); return NextResponse.json({ campaign: updated });
  } catch (error) { console.error("Campaign landing settings API error:", error); return NextResponse.json({ error: "Unable to update campaign landing settings." }, { status: 500 }); }
}
