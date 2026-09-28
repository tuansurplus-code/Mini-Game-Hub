import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../../../lib/supabase-server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PrizeInput = {
  name: string;
  description: string | null;
  image_url: string | null;
  weight: number;
  inventory: number | null;
  active: boolean;
  metadata: Record<string, unknown>;
};

type PrizeValidationResult =
  | {
      value: PrizeInput;
      error?: never;
    }
  | {
      value?: never;
      error: string;
    };

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function validatePrizeInput(
  body: Record<string, unknown>
): PrizeValidationResult {
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
      ? (body.metadata as Record<string, unknown>)
      : {};

  if (!name) {
    return {
      error: "Prize name is required.",
    };
  }

  if (!Number.isFinite(weight) || weight < 0) {
    return {
      error:
        "Prize weight must be a number greater than or equal to 0.",
    };
  }

  if (
    inventory !== null &&
    (!Number.isInteger(inventory) || inventory < 0)
  ) {
    return {
      error:
        "Inventory must be a whole number greater than or equal to 0.",
    };
  }

  return {
    value: {
      name,
      description,
      image_url: imageUrl,
      weight,
      inventory,
      active,
      metadata,
    },
  };
}

async function verifyCampaignGame(
  campaignGameId: string,
  workspaceId: string
) {
  const supabase =
    await createSupabaseServerClient();

  const { data, error } = await supabase
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
    .eq(
      "campaigns.workspace_id",
      workspaceId
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Verify campaign game error:",
      error
    );

    return {
      campaignGame: null,
      error:
        "Failed to verify campaign game.",
    };
  }

  return {
    campaignGame: data,
    error: null,
  };
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { workspaceId } =
      await requireAdmin();

    const {
      id: campaignGameId,
    } = await context.params;

    if (
      !campaignGameId ||
      !isValidUuid(campaignGameId)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid campaign game ID.",
        },
        { status: 400 }
      );
    }

    const supabase =
      await createSupabaseServerClient();

    const {
      data: campaignGame,
      error: campaignGameError,
    } = await supabase
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
      .eq(
        "campaigns.workspace_id",
        workspaceId
      )
      .maybeSingle();

    if (campaignGameError) {
      console.error(
        "Load campaign game for prizes error:",
        campaignGameError
      );

      return NextResponse.json(
        {
          error:
            "Failed to verify campaign game.",
        },
        { status: 400 }
      );
    }

    if (!campaignGame) {
      return NextResponse.json(
        {
          error:
            "Campaign game not found.",
        },
        { status: 404 }
      );
    }

    const {
      data: prizes,
      error: prizesError,
    } = await supabase
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
      .eq(
        "campaign_game_id",
        campaignGameId
      )
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
        error:
          "Unable to load prizes.",
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
    const {
      workspaceId,
      role,
    } = await requireAdmin();

    if (
      ![
        "owner",
        "admin",
        "editor",
      ].includes(role)
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to manage prizes.",
        },
        { status: 403 }
      );
    }

    const {
      id: campaignGameId,
    } = await context.params;

    if (
      !campaignGameId ||
      !isValidUuid(campaignGameId)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid campaign game ID.",
        },
        { status: 400 }
      );
    }

    const body =
      (await request.json()) as Record<
        string,
        unknown
      >;

    const validation =
      validatePrizeInput(body);

    if ("error" in validation) {
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: 400 }
      );
    }

    const verified =
      await verifyCampaignGame(
        campaignGameId,
        workspaceId
      );

    if (verified.error) {
      return NextResponse.json(
        {
          error: verified.error,
        },
        { status: 400 }
      );
    }

    if (!verified.campaignGame) {
      return NextResponse.json(
        {
          error:
            "Campaign game not found.",
        },
        { status: 404 }
      );
    }

    const supabase =
      await createSupabaseServerClient();

    const {
      data: prize,
      error: prizeError,
    } = await supabase
      .from("prizes")
      .insert({
        campaign_game_id:
          campaignGameId,
        ...validation.value,
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
        error:
          "Unable to create prize.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const {
      workspaceId,
      role,
    } = await requireAdmin();

    if (
      ![
        "owner",
        "admin",
        "editor",
      ].includes(role)
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to manage prizes.",
        },
        { status: 403 }
      );
    }

    const {
      id: campaignGameId,
    } = await context.params;

    if (
      !campaignGameId ||
      !isValidUuid(campaignGameId)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid campaign game ID.",
        },
        { status: 400 }
      );
    }

    const body =
      (await request.json()) as Record<
        string,
        unknown
      >;

    const prizeId = String(
      body.prize_id ?? ""
    ).trim();

    if (
      !prizeId ||
      !isValidUuid(prizeId)
    ) {
      return NextResponse.json(
        {
          error: "Invalid prize ID.",
        },
        { status: 400 }
      );
    }

    const validation =
      validatePrizeInput(body);

    if ("error" in validation) {
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: 400 }
      );
    }

    const verified =
      await verifyCampaignGame(
        campaignGameId,
        workspaceId
      );

    if (verified.error) {
      return NextResponse.json(
        {
          error: verified.error,
        },
        { status: 400 }
      );
    }

    if (!verified.campaignGame) {
      return NextResponse.json(
        {
          error:
            "Campaign game not found.",
        },
        { status: 404 }
      );
    }

    const supabase =
      await createSupabaseServerClient();

    const {
      data: existingPrize,
      error: existingPrizeError,
    } = await supabase
      .from("prizes")
      .select("id")
      .eq("id", prizeId)
      .eq(
        "campaign_game_id",
        campaignGameId
      )
      .maybeSingle();

    if (existingPrizeError) {
      console.error(
        "Verify prize for update error:",
        existingPrizeError
      );

      return NextResponse.json(
        {
          error:
            "Failed to verify prize.",
        },
        { status: 400 }
      );
    }

    if (!existingPrize) {
      return NextResponse.json(
        {
          error: "Prize not found.",
        },
        { status: 404 }
      );
    }

    const {
      data: prize,
      error: prizeError,
    } = await supabase
      .from("prizes")
      .update(validation.value)
      .eq("id", prizeId)
      .eq(
        "campaign_game_id",
        campaignGameId
      )
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
        "Update prize error:",
        prizeError
      );

      return NextResponse.json(
        {
          error: prizeError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      prize,
    });
  } catch (error) {
    console.error(
      "Update campaign prize error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to update prize.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const {
      workspaceId,
      role,
    } = await requireAdmin();

    if (
      ![
        "owner",
        "admin",
        "editor",
      ].includes(role)
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to manage prizes.",
        },
        { status: 403 }
      );
    }

    const {
      id: campaignGameId,
    } = await context.params;

    if (
      !campaignGameId ||
      !isValidUuid(campaignGameId)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid campaign game ID.",
        },
        { status: 400 }
      );
    }

    const body =
      (await request.json()) as Record<
        string,
        unknown
      >;

    const prizeId = String(
      body.prize_id ?? ""
    ).trim();

    if (
      !prizeId ||
      !isValidUuid(prizeId)
    ) {
      return NextResponse.json(
        {
          error: "Invalid prize ID.",
        },
        { status: 400 }
      );
    }

    const verified =
      await verifyCampaignGame(
        campaignGameId,
        workspaceId
      );

    if (verified.error) {
      return NextResponse.json(
        {
          error: verified.error,
        },
        { status: 400 }
      );
    }

    if (!verified.campaignGame) {
      return NextResponse.json(
        {
          error:
            "Campaign game not found.",
        },
        { status: 404 }
      );
    }

    const supabase =
      await createSupabaseServerClient();

    const {
      data: existingPrize,
      error: existingPrizeError,
    } = await supabase
      .from("prizes")
      .select("id")
      .eq("id", prizeId)
      .eq(
        "campaign_game_id",
        campaignGameId
      )
      .maybeSingle();

    if (existingPrizeError) {
      console.error(
        "Verify prize for deletion error:",
        existingPrizeError
      );

      return NextResponse.json(
        {
          error:
            "Failed to verify prize.",
        },
        { status: 400 }
      );
    }

    if (!existingPrize) {
      return NextResponse.json(
        {
          error: "Prize not found.",
        },
        { status: 404 }
      );
    }

    const {
      error: deleteError,
    } = await supabase
      .from("prizes")
      .delete()
      .eq("id", prizeId)
      .eq(
        "campaign_game_id",
        campaignGameId
      );

    if (deleteError) {
      console.error(
        "Delete prize error:",
        deleteError
      );

      return NextResponse.json(
        {
          error: deleteError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      prize_id: prizeId,
    });
  } catch (error) {
    console.error(
      "Delete campaign prize error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to delete prize.",
      },
      { status: 500 }
    );
  }
}
