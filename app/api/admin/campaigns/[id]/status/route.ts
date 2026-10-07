import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../../../lib/supabase-server";

type RouteContext = { params: Promise<{ id: string }> };
const allowedActions = ["activate", "pause", "resume", "end"] as const;
type CampaignAction = (typeof allowedActions)[number];

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { workspaceId } = await requireAdmin();
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: campaign, error } = await supabase.from("campaigns").select("id, status, scheduling_mode, starts_at, ends_at").eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
    if (error) return NextResponse.json({ error: "Unable to load campaign status." }, { status: 500 });
    if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Campaign status load error:", error);
    return NextResponse.json({ error: "Unable to load campaign status." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { workspaceId, role } = await requireAdmin();
    if (!["owner", "admin", "editor"].includes(role)) return NextResponse.json({ error: "You do not have permission to control campaigns." }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const action = String(body.action ?? "") as CampaignAction;
    if (!allowedActions.includes(action)) return NextResponse.json({ error: "Invalid campaign action." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: campaign, error: loadError } = await supabase.from("campaigns").select("id, status, scheduling_mode, starts_at, ends_at").eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
    if (loadError) return NextResponse.json({ error: "Unable to load campaign." }, { status: 500 });
    if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

    let nextStatus: string;
    if (action === "activate") {
      if (!["draft", "scheduled"].includes(campaign.status)) return NextResponse.json({ error: "Only draft or scheduled campaigns can be activated." }, { status: 409 });
      nextStatus = "active";
    } else if (action === "pause") {
      if (campaign.status !== "active") return NextResponse.json({ error: "Only active campaigns can be paused." }, { status: 409 });
      nextStatus = "paused";
    } else if (action === "resume") {
      if (campaign.status !== "paused") return NextResponse.json({ error: "Only paused campaigns can be resumed." }, { status: 409 });
      if (campaign.ends_at && new Date(campaign.ends_at).getTime() <= Date.now()) return NextResponse.json({ error: "This campaign has already reached its end date. Extend the end date before resuming." }, { status: 409 });
      nextStatus = campaign.scheduling_mode === "automatic" && campaign.starts_at && new Date(campaign.starts_at).getTime() > Date.now() ? "scheduled" : "active";
    } else {
      if (!["active", "paused", "scheduled"].includes(campaign.status)) return NextResponse.json({ error: "This campaign cannot be ended from its current status." }, { status: 409 });
      nextStatus = "ended";
    }

    const { data: updatedCampaign, error: updateError } = await supabase.from("campaigns").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", workspaceId).select("id, status, scheduling_mode, starts_at, ends_at").single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
    return NextResponse.json({ campaign: updatedCampaign });
  } catch (error) {
    console.error("Campaign status control error:", error);
    return NextResponse.json({ error: "Unable to update campaign status." }, { status: 500 });
  }
}
