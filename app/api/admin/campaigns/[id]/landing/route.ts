import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../../../lib/supabase-server";

type RouteContext = { params: Promise<{ id: string }> };

const hexColor = /^#[0-9a-fA-F]{6}$/;

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { workspaceId, role } = await requireAdmin();
    if (!["owner", "admin", "editor"].includes(role)) {
      return NextResponse.json({ error: "You do not have permission to update campaign appearance." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const subtitle = String(body.subtitle ?? "").trim().slice(0, 180);
    const fields = ["background_color", "card_background_color", "text_color", "button_color", "button_text_color"] as const;
    const landing: Record<string, string> = { subtitle };

    for (const field of fields) {
      const value = String(body[field] ?? "").trim();
      if (!hexColor.test(value)) {
        return NextResponse.json({ error: `Invalid color value for ${field}.` }, { status: 400 });
      }
      landing[field] = value;
    }

    const supabase = await createSupabaseServerClient();
    const { data: campaign, error: loadError } = await supabase
      .from("campaigns")
      .select("id, settings")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (loadError) return NextResponse.json({ error: loadError.message }, { status: 400 });
    if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

    const currentSettings = campaign.settings && typeof campaign.settings === "object" && !Array.isArray(campaign.settings)
      ? campaign.settings as Record<string, unknown>
      : {};

    const settings = { ...currentSettings, landing };
    const { data: updated, error } = await supabase
      .from("campaigns")
      .update({ settings, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select("id, settings")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ campaign: updated });
  } catch (error) {
    console.error("Campaign landing settings API error:", error);
    return NextResponse.json({ error: "Unable to update campaign landing settings." }, { status: 500 });
  }
}
