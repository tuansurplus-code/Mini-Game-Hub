import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

export async function GET() {
  try {
    const { workspaceId } = await requireAdmin();

    const supabase = await createSupabaseServerClient();

    const [campaignsResult, gamesResult] = await Promise.all([
      supabase
        .from("campaigns")
        .select("id, name")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),

      supabase
        .from("games")
        .select("id, name, type, status")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
    ]);

    if (campaignsResult.error) {
      return NextResponse.json(
        { error: campaignsResult.error.message },
        { status: 400 }
      );
    }

    if (gamesResult.error) {
      return NextResponse.json(
        { error: gamesResult.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      campaigns: campaignsResult.data ?? [],
      games: gamesResult.data ?? [],
    });
  } catch (error) {
    console.error(
      "Load campaign game assignment data error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load campaigns and games.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { workspaceId, role } = await requireAdmin();

    if (!["owner", "admin", "editor"].includes(role)) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to assign games to campaigns.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const campaignId = String(body.campaign_id ?? "").trim();
    const gameId = String(body.game_id ?? "").trim();

    if (!campaignId || !gameId) {
      return NextResponse.json(
        {
          error: "Campaign and game are required.",
        },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data: campaign, error: campaignError } =
      await supabase
        .from("campaigns")
        .select("id")
        .eq("id", campaignId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();

    if (campaignError) {
      return NextResponse.json(
        { error: campaignError.message },
        { status: 400 }
      );
    }

    if (!campaign) {
      return NextResponse.json(
        {
          error: "Campaign not found.",
        },
        { status: 404 }
      );
    }

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id")
      .eq("id", gameId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (gameError) {
      return NextResponse.json(
        { error: gameError.message },
        { status: 400 }
      );
    }

    if (!game) {
      return NextResponse.json(
        {
          error: "Game not found.",
        },
        { status: 404 }
      );
    }

    const { data: existingAssignment } = await supabase
      .from("campaign_games")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("game_id", gameId)
      .maybeSingle();

    if (existingAssignment) {
      return NextResponse.json(
        {
          error: "This game is already assigned to the campaign.",
        },
        { status: 409 }
      );
    }

    const { data: lastGame } = await supabase
      .from("campaign_games")
      .select("display_order")
      .eq("campaign_id", campaignId)
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const displayOrder =
      lastGame?.display_order != null
        ? lastGame.display_order + 1
        : 1;

    const { data: campaignGame, error } = await supabase
      .from("campaign_games")
      .insert({
        campaign_id: campaignId,
        game_id: gameId,
        status: "draft",
        display_order: displayOrder,
        appearance: {},
        rules: {},
      })
      .select(
        `
          id,
          campaign_id,
          game_id,
          public_slug,
          status,
          display_order,
          created_at
        `
      )
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { campaignGame },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Assign game to campaign error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to assign game to campaign.",
      },
      { status: 500 }
    );
  }
}
