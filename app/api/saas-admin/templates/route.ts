import { NextResponse } from "next/server";
import { getPlatformAdmin } from "../../../../lib/platform-auth";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

const categories = ["text", "colors", "styles", "advanced"] as const;
const gameTypes = ["spin", "scratch", "pick-card"] as const;
const appearanceKeys: Record<(typeof gameTypes)[number], string[]> = {
  spin: ["title","subtitle","button_text","page_background_color","button_color","button_text_color","wheel_style","wheel_theme","segment_sizing","min_visual_segments","wheel_border_color","wheel_border_thickness","center_color","center_size","pointer_color","prize_text_color","prize_text_size","text_orientation","animation_duration"],
  scratch: ["title","subtitle","button_text","page_background_color","button_color","button_text_color","scratch_style","scratch_cover_color","scratch_cover_alt_color","scratch_card_background","scratch_card_border_color","scratch_card_border_thickness","scratch_card_radius","scratch_instruction","scratch_reveal_percent"],
  "pick-card": ["title","subtitle","button_text","page_background_color","button_color","button_text_color","card_theme","card_style","card_back_color","card_back_alt_color","card_front_color","card_border_color","card_radius","card_count","reveal_duration"],
};
const featureLabels: Record<string,string> = { text: "Text", colors: "Colors", styles: "Game styles", advanced: "Advanced controls" };

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
function validAppearance(gameType: string, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const allowed = new Set(appearanceKeys[gameType as keyof typeof appearanceKeys] ?? []);
  const result: Record<string, string | number> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!allowed.has(key)) continue;
    if (typeof entry === "string" && entry.length <= 160) {
      if ((key.includes("color") || key.includes("background")) && !/^#[0-9a-fA-F]{6}$/.test(entry)) return null;
      result[key] = entry;
    }
    else if (typeof entry === "number" && Number.isFinite(entry) && entry >= 0 && entry <= 10000) result[key] = entry;
    else return null;
  }
  return result;
}

export async function GET() {
  try {
    const admin = await getPlatformAdmin();
    if (!admin) return fail("Platform admin access required.", 403);
    const supabase = await createSupabaseServerClient("platform");
    const [{ data: templates, error: templateError }, { data: plans, error: planError }, { data: permissions, error: permissionError }] = await Promise.all([
      supabase.from("platform_game_templates").select("game_type,name,description,active,feature_flags,default_appearance,updated_at").order("name"),
      supabase.from("subscription_plans").select("id,slug,name,active").order("sort_order"),
      supabase.from("subscription_plan_game_permissions").select("plan_id,game_type,enabled,allowed_customizations"),
    ]);
    if (templateError || planError || permissionError) return fail("Unable to load the game catalog.", 400);
    const permissionMap = new Map((permissions ?? []).map((item: any) => [item.plan_id + ":" + item.game_type, item]));
    const result = (templates ?? []).map((template: any) => ({
      ...template,
      plan_permissions: (plans ?? []).map((plan: any) => {
        const permission: any = permissionMap.get(plan.id + ":" + template.game_type);
        return {
          plan_id: plan.id,
          plan_name: plan.name,
          plan_slug: plan.slug,
          plan_active: plan.active,
          enabled: permission?.enabled ?? true,
          allowed_customizations: permission?.allowed_customizations ?? ["text","colors","styles","advanced"],
        };
      }),
    }));
    return NextResponse.json({ templates: result, plans: plans ?? [], categories, feature_labels: featureLabels }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Load game template catalog error:", error);
    return fail("Unable to load the game catalog.", 500);
  }
}

export async function PATCH(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return fail("Invalid request origin.", 403);
  try {
    const admin = await getPlatformAdmin();
    if (!admin) return fail("Platform admin access required.", 403);
    if (admin.role === "support") return fail("Your platform role can view the catalog but cannot change it.", 403);
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return fail("Invalid request.", 400); }

    const gameType = typeof body.game_type === "string" ? body.game_type : "";
    if (!gameTypes.includes(gameType as (typeof gameTypes)[number])) return fail("Choose a supported game.", 400);
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 400) : "";
    if (!name) return fail("Game name is required.", 400);
    if (typeof body.active !== "boolean") return fail("Choose whether this game is available.", 400);

    const rawFeatures = body.feature_flags && typeof body.feature_flags === "object" && !Array.isArray(body.feature_flags)
      ? body.feature_flags as Record<string, unknown> : {};
    const features: Record<string, boolean> = {};
    for (const key of categories) {
      if (typeof rawFeatures[key] !== "boolean") return fail("Set each platform feature to on or off.", 400);
      features[key] = rawFeatures[key] as boolean;
    }
    const appearance = validAppearance(gameType, body.default_appearance);
    if (!appearance) return fail("One or more default appearance values are invalid.", 400);
    if (!Array.isArray(body.plan_permissions)) return fail("Plan access settings are required.", 400);
    const planPermissions = body.plan_permissions.map((value: any) => {
      const allowed = Array.isArray(value?.allowed_customizations)
        ? value.allowed_customizations.filter((item: unknown) => categories.includes(item as any))
        : [];
      return {
        plan_id: String(value?.plan_id ?? ""),
        game_type: gameType,
        enabled: value?.enabled === true,
        allowed_customizations: allowed.filter((category: string) => features[category]),
        updated_at: new Date().toISOString(),
      };
    });
    if (planPermissions.some((item: any) => !/^[0-9a-f-]{36}$/i.test(item.plan_id))) return fail("A plan setting is invalid.", 400);

    const supabase = await createSupabaseServerClient("platform");
    const { data: validPlans, error: plansError } = await supabase.from("subscription_plans").select("id");
    if (plansError) return fail("Unable to verify plan settings.", 400);
    const planIds = new Set((validPlans ?? []).map((plan: any) => plan.id));
    if (planPermissions.some((item: any) => !planIds.has(item.plan_id))) return fail("A selected plan no longer exists. Reload and try again.", 409);

    const { data: template, error: templateError } = await supabase.from("platform_game_templates")
      .update({ name, description, active: body.active, feature_flags: features, default_appearance: appearance, updated_at: new Date().toISOString() })
      .eq("game_type", gameType)
      .select("game_type,name,description,active,feature_flags,default_appearance,updated_at")
      .single();
    if (templateError || !template) return fail("Unable to save the game settings.", 400);

    if (planPermissions.length) {
      const { error } = await supabase.from("subscription_plan_game_permissions")
        .upsert(planPermissions, { onConflict: "plan_id,game_type" });
      if (error) return fail("Game settings saved, but plan access could not be saved. Reload and retry plan access.", 400);
    }
    return NextResponse.json({ template });
  } catch (error) {
    console.error("Save game template settings error:", error);
    return fail("Unable to save the game settings.", 500);
  }
}
