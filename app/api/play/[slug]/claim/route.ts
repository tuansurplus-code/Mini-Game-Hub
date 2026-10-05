import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../lib/supabase-server";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function normalizeSriLankanMobile(mobile: string): string | null {
  const cleaned = mobile.trim().replace(/\s+/g, "");
  if (/^07\d{8}$/.test(cleaned)) return `+94${cleaned.slice(1)}`;
  if (/^947\d{8}$/.test(cleaned)) return `+${cleaned}`;
  if (/^\+947\d{8}$/.test(cleaned)) return cleaned;
  return null;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const body = await request.json();
    const mobileE164 = normalizeSriLankanMobile(typeof body.mobile === "string" ? body.mobile : "");
    const sessionId = typeof body.session_id === "string" ? body.session_id : "";
    const winnerId = typeof body.winner_id === "string" ? body.winner_id : "";

    if (!slug || !mobileE164 || !sessionId || !winnerId) {
      return NextResponse.json({ error: "Invalid prize claim request." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: campaignGame, error: gameError } = await supabase
      .from("campaign_games")
      .select("id")
      .eq("public_slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (gameError || !campaignGame) {
      return NextResponse.json({ error: "Game not found." }, { status: 404 });
    }

    const { data, error } = await supabase.rpc("claim_prize", {
      p_session_id: sessionId,
      p_winner_id: winnerId,
      p_mobile_e164: mobileE164,
      p_name: typeof body.name === "string" ? body.name : null,
      p_email: typeof body.email === "string" ? body.email : null,
      p_address: typeof body.address === "string" ? body.address : null,
    });

    if (error) {
      console.error("Prize claim RPC error:", error);
      return NextResponse.json({ error: error.message || "Unable to claim the prize." }, { status: 400 });
    }

    return NextResponse.json({ result: data });
  } catch (error) {
    console.error("Prize claim API error:", error);
    return NextResponse.json({ error: "Unable to process the prize claim." }, { status: 500 });
  }
}
