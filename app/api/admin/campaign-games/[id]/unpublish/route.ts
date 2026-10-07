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
        { error: "Campaign game ID or public slug is required." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const selectFields = `
      id,
      public_slug,
      status,
      campaigns!inner (
        id,
        workspace_id
      )
    `;

    let lookup = await supabase
      .from("campaign_games")
      .select(selectFields)
      .eq("id", id)
      .eq("campaigns.workspace_id", workspaceId)
      .maybeSingle();

    if (!lookup.data && !lookup.error) {
      lookup = await supabase
        .from("campaign_games")
        .select(selectFields)
        .eq("public_slug", id)
        .eq("campaigns.workspace_id", workspaceId)
        .maybeSingle();
    }

    if (lookup.error) {
      console.error("Verify campaign game before unpublish error:", lookup.error);
      return NextResponse.json({ error: lookup.error.message }, { status: 400 });
    }

    const campaignGame = lookup.data;

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
      .eq("id", campaignGame.id)
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
