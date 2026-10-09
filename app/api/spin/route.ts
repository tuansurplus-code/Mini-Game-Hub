import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { getClientIp, rateLimit, tooManyRequests } from "../../../lib/rate-limit";

function normalizeSriLankanMobile(value: unknown) {
  const cleaned = String(value ?? "").trim().replace(/[\s\-()]/g, "");
  if (/^07\d{8}$/.test(cleaned)) return `+94${cleaned.slice(1)}`;
  if (/^947\d{8}$/.test(cleaned)) return `+${cleaned}`;
  if (/^\+947\d{8}$/.test(cleaned)) return cleaned;
  return null;
}

function playError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("already played")) return { status: 409, error: "This mobile number has already played." };
  if (normalized.includes("not currently available")) return { status: 409, error: "This game is not currently available." };
  if (normalized.includes("no prizes are currently available")) return { status: 409, error: "No prizes are currently available." };
  if (normalized.includes("prize inventory changed")) return { status: 409, error: "Prize availability changed. Please try again." };
  return { status: 500, error: "Unable to complete the spin." };
}

export async function POST(request: Request) {
  try {
    const ipLimit = rateLimit(`legacy-spin:ip:${getClientIp(request)}`, 12, 60_000);
    if (!ipLimit.allowed) return tooManyRequests(ipLimit.retryAfter);

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 4096) return NextResponse.json({ error: "Request is too large." }, { status: 413 });

    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

    const campaignGameId = typeof body.campaign_game_id === "string" ? body.campaign_game_id.trim() : "";
    const mobile = normalizeSriLankanMobile(body.mobile);
    const requestId = typeof body.request_id === "string" ? body.request_id.trim() : "";
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuid.test(campaignGameId) || !mobile || !uuid.test(requestId)) return NextResponse.json({ error: "Invalid spin request." }, { status: 400 });

    const mobileLimit = rateLimit(`legacy-spin:mobile:${campaignGameId}:${mobile}`, 5, 60_000);
    if (!mobileLimit.allowed) return tooManyRequests(mobileLimit.retryAfter);

    const supabase = await createSupabaseServerClient();
    const { data: campaignGame, error: gameError } = await supabase.from("campaign_games").select("id,status,campaigns!inner(status,starts_at,ends_at)").eq("id", campaignGameId).eq("status", "published").maybeSingle();
    if (gameError || !campaignGame) return NextResponse.json({ error: "Game not found." }, { status: 404 });

    const cv = campaignGame.campaigns;
    const campaign = Array.isArray(cv) ? cv[0] : cv;
    const now = new Date();
    const startsAt = campaign?.starts_at ? new Date(campaign.starts_at) : null;
    const endsAt = campaign?.ends_at ? new Date(campaign.ends_at) : null;
    if (!campaign || campaign.status !== "active" || (startsAt && startsAt > now) || (endsAt && endsAt < now)) return NextResponse.json({ error: "This game is not currently available." }, { status: 409 });

    const { data, error } = await supabase.rpc("play_spin", { p_campaign_game_id: campaignGameId, p_mobile_e164: mobile, p_request_id: requestId });
    if (error) {
      console.error("Legacy spin RPC error:", error.code);
      const friendly = playError(error.message || "");
      return NextResponse.json({ error: friendly.error }, { status: friendly.status });
    }

    return NextResponse.json({ success: true, result: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Legacy spin API error:", error);
    return NextResponse.json({ error: "Unable to process the spin." }, { status: 500 });
  }
}
