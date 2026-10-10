import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "../../../../lib/platform-auth";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

const featureKeys = ["custom_branding", "automatic_scheduling", "advanced_reports"] as const;
type FeatureKey = (typeof featureKeys)[number];

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function optionalLimit(value: unknown, label: string) {
  if (value === null) return { value: null as number | null, error: "" };
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return { value: null, error: `${label} must be a positive whole number or unlimited.` };
  }
  return { value, error: "" };
}

export async function GET() {
  try {
    await requirePlatformAdmin();
    const supabase = await createSupabaseServerClient();
    const { data: plans, error } = await supabase.from("subscription_plans")
      .select("id,slug,name,description,monthly_price_lkr,max_active_campaigns,max_monthly_participants,max_team_members,feature_flags,active,sort_order")
      .order("sort_order", { ascending: true });
    if (error) return jsonError("Unable to load plans.", 400);
    return NextResponse.json({ plans: plans ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Load subscription plans error:", error);
    return jsonError("Unable to load plans.", 500);
  }
}

export async function PATCH(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return jsonError("Invalid request origin.", 403);
  }
  try {
    const { role } = await requirePlatformAdmin();
    if (role === "support") return jsonError("Your platform role cannot change plans.", 403);

    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return jsonError("Invalid request.", 400); }

    const id = typeof body.id === "string" ? body.id : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 500) : "";
    const price = body.monthly_price_lkr === null ? null : body.monthly_price_lkr;
    const active = body.active;

    if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError("Invalid plan.", 400);
    if (!name) return jsonError("Plan name is required.", 400);
    if (price !== null && (typeof price !== "number" || !Number.isFinite(price) || price < 0)) {
      return jsonError("Monthly price must be zero or a positive amount in LKR.", 400);
    }
    if (typeof active !== "boolean") return jsonError("Choose whether this plan is available.", 400);

    const campaigns = optionalLimit(body.max_active_campaigns, "Campaign limit");
    const participants = optionalLimit(body.max_monthly_participants, "Participant limit");
    const members = optionalLimit(body.max_team_members, "Team member limit");
    const invalidLimit = [campaigns.error, participants.error, members.error].find(Boolean);
    if (invalidLimit) return jsonError(invalidLimit, 400);

    const rawFeatures = body.feature_flags && typeof body.feature_flags === "object" && !Array.isArray(body.feature_flags)
      ? body.feature_flags as Record<string, unknown>
      : {};
    const featureFlags: Record<FeatureKey, boolean> = {
      custom_branding: rawFeatures.custom_branding === true,
      automatic_scheduling: rawFeatures.automatic_scheduling === true,
      advanced_reports: rawFeatures.advanced_reports === true,
    };

    const supabase = await createSupabaseServerClient();
    const { data: plan, error } = await supabase.from("subscription_plans")
      .update({
        name,
        description,
        monthly_price_lkr: price,
        max_active_campaigns: campaigns.value,
        max_monthly_participants: participants.value,
        max_team_members: members.value,
        feature_flags: featureFlags,
        active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id,slug,name,description,monthly_price_lkr,max_active_campaigns,max_monthly_participants,max_team_members,feature_flags,active,sort_order")
      .maybeSingle();

    if (error) return jsonError("Unable to save this plan.", 400);
    if (!plan) return jsonError("Plan not found.", 404);
    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Save subscription plan error:", error);
    return jsonError("Unable to save this plan.", 500);
  }
}
