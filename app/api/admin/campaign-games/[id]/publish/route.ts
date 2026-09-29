import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../../../lib/supabase-server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  _request: Request,
  context: RouteContext
) {
  try {
    const { workspaceId, role } = await requireAdmin();

    if (!["owner", "admin", "editor"].includes(role)) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to publish campaign games.",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Campaign game ID is required.",
        },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    /*
     * Verify that the campaign game belongs to a campaign
     * inside the current admin workspace.
     */
    const { data: campaignGame, error: lookupError } =
      await supabase
        .from("campaign_games")
        .select(
          `
            id,
            campaign_id,
            public_slug,
            status,
            campaigns!inner (
              id,
              workspace_id,
              name,
              status
            ),
            games (
              id,
              name,
              type,
              status
            )
          `
        )
        .eq("id", id)
        .eq("campaigns.workspace_id", workspaceId)
        .maybeSingle();

    if (lookupError) {
      console.error(
        "Verify campaign game before publish error:",
        lookupError
      );

      return NextResponse.json(
        {
          error: lookupError.message,
        },
        { status: 400 }
      );
    }

    if (!campaignGame) {
      return NextResponse.json(
        {
          error: "Campaign game not found.",
        },
        { status: 404 }
      );
    }

    if (campaignGame.status === "published") {
      return NextResponse.json(
        {
          error: "This campaign game is already published.",
        },
        { status: 409 }
      );
    }

    /*
     * A campaign game can be published while its campaign
     * is still draft/scheduled. The existing public RLS policy
     * will only expose it when the campaign is active and
     * within its configured schedule.
     */
    const { data: updatedCampaignGame, error: updateError } =
      await supabase
        .from("campaign_games")
        .update({
          status: "published",
        })
        .eq("id", id)
        .select(
          `
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
          `
        )
        .single();

    if (updateError) {
      console.error(
        "Publish campaign game error:",
        updateError
      );

      return NextResponse.json(
        {
          error: updateError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      campaignGame: updatedCampaignGame,
    });
  } catch (error) {
    console.error(
      "Campaign game publish API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to publish campaign game.",
      },
      { status: 500 }
    );
  }
}
