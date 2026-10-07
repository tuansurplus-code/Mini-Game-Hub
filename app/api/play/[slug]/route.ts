import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

function normalizeSriLankanMobile(mobile: string): string | null {
  const cleaned = mobile.trim().replace(/\s+/g, "");

  if (/^07\d{8}$/.test(cleaned)) return `+94${cleaned.slice(1)}`;
  if (/^947\d{8}$/.test(cleaned)) return `+${cleaned}`;
  if (/^\+947\d{8}$/.test(cleaned)) return cleaned;
  return null;
}

function getFriendlyPlayError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("already played today")) {
    return {
      code: "ALREADY_PLAYED_TODAY",
      title: "Already Played Today",
      message: "You have already played today. Please come back tomorrow for another chance to win.",
    };
  }

  if (normalized.includes("already played this campaign")) {
    return {
      code: "ALREADY_PLAYED_CAMPAIGN",
      title: "Play Already Used",
      message: "This mobile number has already played this campaign.",
    };
  }

  if (normalized.includes("winning limit reached")) {
    return {
      code: "WINNING_LIMIT_REACHED",
      title: "Winning Limit Reached",
      message: "You have reached the maximum number of prizes available to this mobile number.",
    };
  }

  if (normalized.includes("no prizes are currently available")) {
    return {
      code: "NO_PRIZES_AVAILABLE",
      title: "Prizes Unavailable",
      message: "No prizes are currently available. Please try again later.",
    };
  }

  if (normalized.includes("prize inventory changed")) {
    return {
      code: "PRIZE_INVENTORY_CHANGED",
      title: "Please Try Again",
      message: "Prize availability changed while processing your play. Please try again.",
    };
  }

  return {
    code: "PLAY_ERROR",
    title: "Unable to Play",
    message: message || "Unable to play the game. Please try again.",
  };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;

    if (!slug) {
      return NextResponse.json({ error: "Game slug is required." }, { status: 400 });
    }

    const body = await request.json();
    const mobile = typeof body.mobile === "string" ? body.mobile : "";
    const mobileE164 = normalizeSriLankanMobile(mobile);

    if (!mobileE164) {
      return NextResponse.json(
        { error: "Please enter a valid Sri Lankan mobile number." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data: campaignGame, error } = await supabase
      .from("campaign_games")
      .select(`
        id,
        public_slug,
        status,
        campaigns!inner (
          id,
          status,
          starts_at,
          ends_at
        )
      `)
      .eq("public_slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error) {
      console.error("Load public campaign game error:", error);
      return NextResponse.json({ error: "Unable to load the game." }, { status: 500 });
    }

    if (!campaignGame) {
      return NextResponse.json({ error: "Game not found." }, { status: 404 });
    }

    const campaignValue = campaignGame.campaigns;
    const campaign = Array.isArray(campaignValue) ? campaignValue[0] : campaignValue;

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign information is unavailable." },
        { status: 404 }
      );
    }

    const now = new Date();
    const startsAt = campaign.starts_at ? new Date(campaign.starts_at) : null;
    const endsAt = campaign.ends_at ? new Date(campaign.ends_at) : null;

    const campaignIsActive =
      campaign.status === "active" &&
      (!startsAt || startsAt <= now) &&
      (!endsAt || endsAt >= now);

    if (!campaignIsActive) {
      return NextResponse.json(
        { error: "This game is not currently available." },
        { status: 409 }
      );
    }

    const requestId = crypto.randomUUID();

    // play_spin is the shared server-side prize-selection engine. The client game
    // (wheel, scratch card, etc.) only reveals the result returned by this RPC.
    const { data: result, error: playError } = await supabase.rpc("play_spin", {
      p_campaign_game_id: campaignGame.id,
      p_mobile_e164: mobileE164,
      p_request_id: requestId,
    });

    if (playError) {
      console.error("Secure play RPC error:", playError);
      const friendlyError = getFriendlyPlayError(
        playError.message || "Unable to play the game."
      );

      return NextResponse.json(
        {
          error: friendlyError.message,
          error_title: friendlyError.title,
          error_code: friendlyError.code,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Public play API error:", error);
    return NextResponse.json(
      { error: "Unable to process the game play." },
      { status: 500 }
    );
  }
}
