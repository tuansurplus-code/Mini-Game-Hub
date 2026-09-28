import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../../lib/supabase-server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { workspaceId } = await requireAdmin();
    const { id: campaignGameId } = await context.params;

    if (!campaignGameId || !isValidUuid(campaignGameId)) {
      return NextResponse.json(
        {
          error: "Invalid campaign game ID.",
        },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Verify that the campaign game belongs to the
    // current workspace.
    const { data: campaignGame, error: campaignGameError } =
      await supabase
        .from("campaign_games")
        .select(
          `
            id,
            campaign_id,
            game_id,
            public_slug,
            status,
            campaigns!inner (
              id,
              workspace_id,
              name,
              slug
            ),
            games (
              id,
              name,
              type
            )
          `
        )
        .eq("id", campaignGameId)
        .eq("campaigns.workspace_id", workspaceId)
        .maybeSingle();

    if (campaignGameError) {
      console.error(
        "Load campaign game for prizes error:",
        campaignGameError
      );

      return NextResponse.json(
        {
          error: "Failed to verify campaign game.",
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

    const { data: prizes, error: prizesError } =
      await supabase
        .from("prizes")
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
            metadata,
            created_at,
            updated_at
          `
        )
        .eq("campaign_game_id", campaignGameId)
        .order("created_at", {
          ascending: true,
        });

    if (prizesError) {
      console.error(
        "Load campaign prizes error:",
        prizesError
      );

      return NextResponse.json(
        {
          error: prizesError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      campaignGame,
      prizes: prizes ?? [],
    });
  } catch (error) {
    console.error(
      "Get campaign game prizes error:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to load prizes.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { workspaceId, role } = await requireAdmin();

    if (!["owner", "admin", "editor"].includes(role)) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to manage prizes.",
        },
        { status: 403 }
      );
    }

    const { id: campaignGameId } = await context.params;

    if (!campaignGameId || !isValidUuid(campaignGameId)) {
      return NextResponse.json(
        {
          error: "Invalid campaign game ID.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const description =
      body.description == null
        ? null
        : String(body.description).trim();

    const imageUrl =
      body.image_url == null
        ? null
        : String(body.image_url).trim();

    const weight = Number(body.weight ?? 0);

    const inventory =
      body.inventory === null ||
      body.inventory === undefined ||
      body.inventory === ""
        ? null
        : Number(body.inventory);

    const active =
      body.active === undefined
        ? true
        : Boolean(body.active);

    const metadata =
      body.metadata &&
      typeof body.metadata === "object" &&
      !Array.isArray(body.metadata)
        ? body.metadata
        : {};

    if (!name) {
      return NextResponse.json(
        {
          error: "Prize name is required.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(weight) || weight < 0) {
      return NextResponse.json(
        {
          error:
            "Prize weight must be a number greater than or equal to 0.",
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
            "Inventory must be a whole number greater than or equal to 0.",
        },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Verify that the campaign game belongs to the
    // current workspace.
    const { data: campaignGame, error: campaignGameError } =
      await supabase
        .from("campaign_games")
        .select(
          `
            id,
            campaign_id,
            campaigns!inner (
              id,
              workspace_id
            )
          `
        )
        .eq("id", campaignGameId)
        .eq("campaigns.workspace_id", workspaceId)
        .maybeSingle();

    if (campaignGameError) {
      console.error(
        "Verify campaign game for prize creation error:",
        campaignGameError
      );

      return NextResponse.json(
        {
          error: "Failed to verify campaign game.",
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

    const { data: prize, error: prizeError } =
      await supabase
        .from("prizes")
        .insert({
          campaign_game_id: campaignGameId,
          name,
          description,
          image_url: imageUrl,
          weight,
          inventory,
          active,
          metadata,
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
            metadata,
            created_at,
            updated_at
          `
        )
        .single();

    if (prizeError) {
      console.error(
        "Create prize error:",
        prizeError
      );

      return NextResponse.json(
        {
          error: prizeError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        prize,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Create campaign prize error:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to create prize.",
      },
      { status: 500 }
    );
  }
}
