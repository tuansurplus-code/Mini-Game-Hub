import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../../../lib/supabase-server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { workspaceId, role } = await requireAdmin();

    if (!["owner", "admin", "editor"].includes(role)) {
      return NextResponse.json(
        { error: "You do not have permission to unpublish campaign games." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Campaign game ID is required." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data: campaignGame, error: lookupError } = await supabase
      .from("campaign_games")
      .select(`
        id,
        status,
        campaigns!inner (
          id,
          workspace_id
        )
      `)
      .eq("id", id)
      .eq("campaigns.workspace_id", workspaceId)
      .maybeSingle();

    if (lookupError) {
      console.error("Verify campaign game before unpublish error:", lookupError);
      return NextResponse.json({ error: lookupError.message }, { status: 400 });
    }

    if (!campaignGame) {
      return NextResponse.json(
        { error: "Campaign game not found." },
        { status: 404 }
      );
    }

    if (campaignGame.status !== "published") {
      return NextResponse.json(
        { error: "This campaign game is not published." },
        { status: 409 }
      );
    }

    const { data: updatedCampaignGame, error: updateError } = await supabase
      .from("campaign_games")
      .update({ status: "draft" })
      .eq("id", id)
      .select(`
        id,
        campaign_id,
        game_id,
        public_slug,
        status,
        display_order,
        appearance,
        rules,
        created_at,
        updated_at
      `)
      .single();

    if (updateError) {
      console.error("Unpublish campaign game error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ campaignGame: updatedCampaignGame });
  } catch (error) {
    console.error("Campaign game unpublish API error:", error);
    return NextResponse.json(
      { error: "Unable to unpublish campaign game." },
      { status: 500 }
    );
  }
}
