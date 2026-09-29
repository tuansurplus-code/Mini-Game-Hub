import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

function normalizeSriLankanMobile(
  mobile: string
): string | null {
  const cleaned = mobile.trim().replace(/\s+/g, "");

  if (/^07\d{8}$/.test(cleaned)) {
    return `+94${cleaned.slice(1)}`;
  }

  if (/^947\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  if (/^\+947\d{8}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { slug } = await context.params;

    if (!slug) {
      return NextResponse.json(
        {
          error: "Game slug is required.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const mobile =
      typeof body.mobile === "string"
        ? body.mobile
        : "";

    const mobileE164 =
      normalizeSriLankanMobile(mobile);

    if (!mobileE164) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid Sri Lankan mobile number.",
        },
        { status: 400 }
      );
    }

    const supabase =
      await createSupabaseServerClient();

    const { data: campaignGame, error } =
      await supabase
        .from("campaign_games")
        .select(
          `
            id,
            public_slug,
            status,
            campaigns!inner (
              id,
              status,
              starts_at,
              ends_at
            )
          `
        )
        .eq("public_slug", slug)
        .eq("status", "published")
        .maybeSingle();

    if (error) {
      console.error(
        "Load public campaign game error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Unable to load the game.",
        },
        { status: 500 }
      );
    }

    if (!campaignGame) {
      return NextResponse.json(
        {
          error: "Game not found.",
        },
        { status: 404 }
      );
    }

    const campaignValue =
      campaignGame.campaigns;

    const campaign = Array.isArray(
      campaignValue
    )
      ? campaignValue[0]
      : campaignValue;

    if (!campaign) {
      return NextResponse.json(
        {
          error:
            "Campaign information is unavailable.",
        },
        { status: 404 }
      );
    }

    const now = new Date();

    const startsAt = campaign.starts_at
      ? new Date(campaign.starts_at)
      : null;

    const endsAt = campaign.ends_at
      ? new Date(campaign.ends_at)
      : null;

    const campaignIsActive =
      campaign.status === "active" &&
      (!startsAt || startsAt <= now) &&
      (!endsAt || endsAt >= now);

    if (!campaignIsActive) {
      return NextResponse.json(
        {
          error:
            "This game is not currently available.",
        },
        { status: 409 }
      );
    }

    const requestId = crypto.randomUUID();

    const { data: result, error: spinError } =
      await supabase.rpc("play_spin", {
        p_campaign_game_id: campaignGame.id,
        p_mobile_e164: mobileE164,
        p_request_id: requestId,
      });

    if (spinError) {
      console.error(
        "Play spin RPC error:",
        spinError
      );

      return NextResponse.json(
        {
          error:
            spinError.message ||
            "Unable to play the game.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      result,
    });
  } catch (error) {
    console.error(
      "Public play API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to process the game play.",
      },
      { status: 500 }
    );
  }
}
