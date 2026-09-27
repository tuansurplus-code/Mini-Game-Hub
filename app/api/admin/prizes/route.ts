import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

const EDITOR_ROLES = ["owner", "admin", "editor"];

function parsePrizeValues(body: any) {
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

  return {
    name,
    description,
    imageUrl,
    weight,
    inventory,
    active,
  };
}

function validatePrizeValues(values: ReturnType<typeof parsePrizeValues>) {
  if (!values.name) {
    return "Prize name is required.";
  }

  if (!Number.isFinite(values.weight) || values.weight < 0) {
    return "Weight must be a valid number greater than or equal to 0.";
  }

  if (
    values.inventory !== null &&
    (!Number.isInteger(values.inventory) || values.inventory < 0)
  ) {
    return "Inventory must be a whole number or left unlimited.";
  }

  return null;
}

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

    if (!EDITOR_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "You do not have permission to create prizes." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const campaignGameId = String(
      body.campaign_game_id ?? ""
    ).trim();

    const values = parsePrizeValues(body);
    const validationError = validatePrizeValues(values);

    if (!campaignGameId || validationError) {
      return NextResponse.json(
        {
          error:
            validationError ||
            "Campaign game and prize name are required.",
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
        name: values.name,
        description: values.description || null,
        image_url: values.imageUrl || null,
        weight: values.weight,
        inventory: values.inventory,
        active: values.active,
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

export async function PATCH(request: Request) {
  try {
    const { workspaceId, role } = await requireAdmin();

    if (!EDITOR_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "You do not have permission to update prizes." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const prizeId = String(body.id ?? "").trim();

    if (!prizeId) {
      return NextResponse.json(
        { error: "Prize ID is required." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data: existingPrize, error: lookupError } = await supabase
      .from("prizes")
      .select(
        `
          id,
          campaign_game_id,
          campaign_games!inner (
            campaigns!inner (
              workspace_id
            )
          )
        `
      )
      .eq("id", prizeId)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json(
        { error: lookupError.message },
        { status: 400 }
      );
    }

    if (!existingPrize) {
      return NextResponse.json(
        { error: "Prize not found." },
        { status: 404 }
      );
    }

    const campaignGame = Array.isArray(existingPrize.campaign_games)
      ? existingPrize.campaign_games[0]
      : existingPrize.campaign_games;

    const campaign = Array.isArray(campaignGame?.campaigns)
      ? campaignGame.campaigns[0]
      : campaignGame?.campaigns;

    if (campaign?.workspace_id !== workspaceId) {
      return NextResponse.json(
        { error: "Prize not found." },
        { status: 404 }
      );
    }

    const values = parsePrizeValues(body);
    const validationError = validatePrizeValues(values);

    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    const { data: prize, error } = await supabase
      .from("prizes")
      .update({
        name: values.name,
        description: values.description || null,
        image_url: values.imageUrl || null,
        weight: values.weight,
        inventory: values.inventory,
        active: values.active,
      })
      .eq("id", prizeId)
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

    return NextResponse.json({ prize });
  } catch (error) {
    console.error("Update prize error:", error);

    return NextResponse.json(
      { error: "Unable to update prize." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { workspaceId, role } = await requireAdmin();

    if (!EDITOR_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "You do not have permission to delete prizes." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const prizeId = String(body.id ?? "").trim();

    if (!prizeId) {
      return NextResponse.json(
        { error: "Prize ID is required." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data: existingPrize, error: lookupError } = await supabase
      .from("prizes")
      .select(
        `
          id,
          campaign_game_id,
          campaign_games!inner (
            campaigns!inner (
              workspace_id
            )
          )
        `
      )
      .eq("id", prizeId)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json(
        { error: lookupError.message },
        { status: 400 }
      );
    }

    if (!existingPrize) {
      return NextResponse.json(
        { error: "Prize not found." },
        { status: 404 }
      );
    }

    const campaignGame = Array.isArray(existingPrize.campaign_games)
      ? existingPrize.campaign_games[0]
      : existingPrize.campaign_games;

    const campaign = Array.isArray(campaignGame?.campaigns)
      ? campaignGame.campaigns[0]
      : campaignGame?.campaigns;

    if (campaign?.workspace_id !== workspaceId) {
      return NextResponse.json(
        { error: "Prize not found." },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("prizes")
      .delete()
      .eq("id", prizeId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Delete prize error:", error);

    return NextResponse.json(
      { error: "Unable to delete prize." },
      { status: 500 }
    );
  }
}
