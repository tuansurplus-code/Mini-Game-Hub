import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

export async function GET() {
  try {
    const { workspaceId } = await requireAdmin();
    const supabase = await createSupabaseServerClient();

    const { data: campaignGames, error } = await supabase
      .from("campaign_games")
      .select(
        `
          id,
          public_slug,
          campaigns!inner (
            id,
            name,
            workspace_id
          ),
          games (
            id,
            name,
            type
          )
        `
      )
      .eq("campaigns.workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      campaignGames: campaignGames ?? [],
    });
  } catch (error) {
    console.error("Load prize form data error:", error);

    return NextResponse.json(
      { error: "Unable to load campaign games." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { workspaceId, role } = await requireAdmin();

    if (!["owner", "admin", "editor"].includes(role)) {
      return NextResponse.json(
        { error: "You do not have permission to create prizes." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const campaignGameId = String(body.campaign_game_id ?? "").trim();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const imageUrl = String(body.image_url ?? "").trim();

    const weight = Number(body.weight);

    const inventory =
      body.inventory === null ||
      body.inventory === "" ||
      body.inventory === undefined
        ? null
        : Number(body.inventory);

    const active = body.active !== false;

    if (!campaignGameId || !name) {
      return NextResponse.json(
        {
          error: "Campaign game and prize name are required.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(weight) || weight < 0) {
      return NextResponse.json(
        {
          error:
            "Weight must be a valid number greater than or equal to 0.",
        },
        { status: 400 }
      );
    }

    if (
      inventory !== null &&
      (!Number.isInteger(inventory) || inventory < 0)
    ) {
      return NextResponse.json(
        {
          error:
            "Inventory must be a whole number or left unlimited.",
        },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data: campaignGame, error: campaignGameError } =
      await supabase
        .from("campaign_games")
        .select(
          `
            id,
            campaigns!inner (
              workspace_id
            )
          `
        )
        .eq("id", campaignGameId)
        .eq("campaigns.workspace_id", workspaceId)
        .maybeSingle();

    if (campaignGameError) {
      return NextResponse.json(
        { error: campaignGameError.message },
        { status: 400 }
      );
    }

    if (!campaignGame) {
      return NextResponse.json(
        { error: "Campaign game not found." },
        { status: 404 }
      );
    }

    const { data: prize, error } = await supabase
      .from("prizes")
      .insert({
        campaign_game_id: campaignGame.id,
        name,
        description: description || null,
        image_url: imageUrl || null,
        weight,
        inventory,
        active,
        metadata: {},
      })
      .select(
        `
          id,
          campaign_game_id,
          name,
          description,
          image_url,
          weight,
          inventory,
          active,
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
      { prize },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create prize error:", error);

    return NextResponse.json(
      { error: "Unable to create prize." },
      { status: 500 }
    );
  }
}
