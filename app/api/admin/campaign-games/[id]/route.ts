import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../../lib/supabase-server";
import { getWorkspaceGamePolicy } from "../../../../../lib/game-template-access";

type RouteContext = { params: Promise<{ id: string }> };
const textFields = new Set(["title","subtitle","button_text","scratch_instruction"]);
const styleFields = new Set(["wheel_style","wheel_theme","segment_sizing","scratch_style","card_theme","card_style","card_symbol"]);
const brandFields = new Set(["logo_url","background_image_url","brand_logo_url"]);
function categoryForField(key: string) {
  if (textFields.has(key)) return "text";
  if (brandFields.has(key)) return "branding";
  if (key.includes("color") || key.includes("background")) return "colors";
  if (styleFields.has(key)) return "styles";
  return "advanced";
}
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspaceId } = await requireAdmin();
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { data: campaignGame, error } = await supabase.from("campaign_games")
      .select("id,campaign_id,game_id,public_slug,status,display_order,appearance,rules,created_at,updated_at,campaigns(id,name,slug,status,starts_at,ends_at),games(id,name,slug,type,description,status,default_config)")
      .eq("id", id).eq("campaigns.workspace_id", workspaceId).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!campaignGame) return NextResponse.json({ error: "Campaign game not found." }, { status: 404 });
    const game = Array.isArray(campaignGame.games) ? campaignGame.games[0] : campaignGame.games;
    const customizationAccess = game?.type ? await getWorkspaceGamePolicy(supabase, workspaceId, game.type) : null;
    return NextResponse.json({ campaignGame, customizationAccess });
  } catch (error) {
    console.error("Campaign game GET error:", error);
    return NextResponse.json({ error: "Unable to load campaign game configuration." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspaceId, role } = await requireAdmin();
    if (!["owner", "admin", "editor"].includes(role)) return NextResponse.json({ error: "You do not have permission to update campaign games." }, { status: 403 });
    const { id } = await context.params;
    const body = await request.json();
    const appearance = body.appearance === undefined ? undefined : body.appearance;
    const rules = body.rules === undefined ? undefined : body.rules;
    if (appearance !== undefined && !isObject(appearance)) return NextResponse.json({ error: "Appearance must be a JSON object." }, { status: 400 });
    if (rules !== undefined && !isObject(rules)) return NextResponse.json({ error: "Rules must be a JSON object." }, { status: 400 });
    if (appearance === undefined && rules === undefined) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: existing, error: lookupError } = await supabase.from("campaign_games")
      .select("id,appearance,rules,campaigns!inner(workspace_id),games(type)")
      .eq("id", id).eq("campaigns.workspace_id", workspaceId).maybeSingle();
    if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 400 });
    if (!existing) return NextResponse.json({ error: "Campaign game not found." }, { status: 404 });
    const game = Array.isArray(existing.games) ? existing.games[0] : existing.games;
    const policy = game?.type ? await getWorkspaceGamePolicy(supabase, workspaceId, game.type) : null;
    const changed = new Set<string>();
    if (appearance) {
      const previous = isObject(existing.appearance) ? existing.appearance : {};
      for (const key of new Set([...Object.keys(previous), ...Object.keys(appearance)])) {
        if (JSON.stringify(previous[key]) !== JSON.stringify(appearance[key])) changed.add(categoryForField(key));
      }
    }
    if (rules) {
      const previous = isObject(existing.rules) ? existing.rules : {};
      if (JSON.stringify(previous) !== JSON.stringify(rules)) changed.add("advanced");
    }
    for (const category of changed) {
      if (category === "branding") {
        if (!policy?.customBrandingAllowed) {
          return NextResponse.json({ error: "Custom campaign landing-page branding is not included in your current plan." }, { status: 403 });
        }
        continue;
      }
      if (policy?.template?.active && policy.template.feature_flags?.[category] === false) {
        return NextResponse.json({ error: "The platform has disabled " + category + " customization for this game." }, { status: 403 });
      }
      if (!policy?.allowedCustomizations.includes(category as any)) {
        return NextResponse.json({ error: "Your plan does not include " + category + " customization for this game." }, { status: 403 });
      }
    }
    const updateData: Record<string, unknown> = {};
    if (appearance !== undefined) updateData.appearance = appearance;
    if (rules !== undefined) updateData.rules = rules;
    const { data: campaignGame, error } = await supabase.from("campaign_games").update(updateData)
      .eq("id", id).select("id,campaign_id,game_id,public_slug,status,display_order,appearance,rules,created_at,updated_at").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ campaignGame });
  } catch (error) {
    console.error("Campaign game PATCH error:", error);
    return NextResponse.json({ error: "Unable to update campaign game configuration." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspaceId, role } = await requireAdmin();
    if (!["owner", "admin", "editor"].includes(role)) return NextResponse.json({ error: "You do not have permission to remove games from campaigns." }, { status: 403 });
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { data: existing } = await supabase.from("campaign_games")
      .select("id,campaigns!inner(workspace_id,status)").eq("id", id).eq("campaigns.workspace_id", workspaceId).maybeSingle();
    if (!existing) return NextResponse.json({ error: "Campaign game not found." }, { status: 404 });
    const campaign = Array.isArray(existing.campaigns) ? existing.campaigns[0] : existing.campaigns;
    if (campaign?.status === "active") return NextResponse.json({ error: "A game cannot be removed while its campaign is live. Pause or end the campaign first." }, { status: 409 });
    const { error } = await supabase.from("campaign_games").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Campaign game delete error:", error);
    return NextResponse.json({ error: "Unable to remove game from campaign." }, { status: 500 });
  }
}
