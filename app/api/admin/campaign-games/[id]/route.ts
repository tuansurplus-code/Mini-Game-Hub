import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../../lib/supabase-server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { workspaceId } = await requireAdmin();

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

    const { data: campaignGame, error } = await supabase
      .from("campaign_games")
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
          updated_at,
          campaigns (
            id,
            name,
            slug,
            status,
            starts_at,
            ends_at
          ),
          games (
            id,
            name,
            slug,
            type,
            description,
            status,
            default_config
          )
        `
      )
      .eq("id", id)
      .eq("campaigns.workspace_id", workspaceId)
      .maybeSingle();

    if (error) {
      console.error(
        "Load campaign game configuration error:",
        error
      );

      return NextResponse.json(
        {
          error: error.message,
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

    return NextResponse.json({
      campaignGame,
    });
  } catch (error) {
    console.error(
      "Campaign game configuration GET error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load campaign game configuration.",
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
    const { workspaceId, role } = await requireAdmin();

    if (!["owner", "admin", "editor"].includes(role)) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to update campaign games.",
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

    const body = await request.json();

    const appearance =
      body.appearance === undefined
        ? undefined
        : body.appearance;

    const rules =
      body.rules === undefined
        ? undefined
        : body.rules;

    if (
      appearance !== undefined &&
      !isObject(appearance)
    ) {
      return NextResponse.json(
        {
          error:
            "Appearance must be a JSON object.",
        },
        { status: 400 }
      );
    }

    if (
      rules !== undefined &&
      !isObject(rules)
    ) {
      return NextResponse.json(
        {
          error:
            "Rules must be a JSON object.",
        },
        { status: 400 }
      );
    }

    if (
      appearance === undefined &&
      rules === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Nothing to update.",
        },
        { status: 400 }
      );
    }

    const supabase =
      await createSupabaseServerClient();

    // First verify that this campaign game belongs
    // to a campaign inside the admin's workspace.
    const { data: existingCampaignGame, error: lookupError } =
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
        .eq("id", id)
        .eq(
          "campaigns.workspace_id",
          workspaceId
        )
        .maybeSingle();

    if (lookupError) {
      console.error(
        "Verify campaign game ownership error:",
        lookupError
      );

      return NextResponse.json(
        {
          error: lookupError.message,
        },
        { status: 400 }
      );
    }

    if (!existingCampaignGame) {
      return NextResponse.json(
        {
          error: "Campaign game not found.",
        },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (appearance !== undefined) {
      updateData.appearance = appearance;
    }

    if (rules !== undefined) {
      updateData.rules = rules;
    }

    const { data: campaignGame, error: updateError } =
      await supabase
        .from("campaign_games")
        .update(updateData)
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
        "Update campaign game configuration error:",
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
      campaignGame,
    });
  } catch (error) {
    console.error(
      "Campaign game configuration PATCH error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to update campaign game configuration.",
      },
      { status: 500 }
    );
  }
}
