import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

function normalizeSriLankanMobile(value: unknown) {
  const raw = String(value ?? "").trim();

  // Remove spaces, hyphens and brackets.
  const cleaned = raw.replace(/[\s\-()]/g, "");

  // Accept:
  // 0771234567
  // +94771234567
  // 94771234567
  let normalized = cleaned;

  if (/^0\d{9}$/.test(cleaned)) {
    normalized = `+94${cleaned.slice(1)}`;
  } else if (/^94\d{9}$/.test(cleaned)) {
    normalized = `+${cleaned}`;
  }

  // Sri Lankan mobile numbers in E.164 form:
  // +94 followed by 9 digits beginning with 7.
  if (!/^\+947\d{8}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const campaignGameId = String(
      body.campaign_game_id ?? ""
    ).trim();

    const mobile = normalizeSriLankanMobile(body.mobile);

    const requestId = String(
      body.request_id ?? ""
    ).trim();

    if (!campaignGameId) {
      return NextResponse.json(
        {
          error: "Campaign game ID is required.",
        },
        { status: 400 }
      );
    }

    if (!mobile) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid Sri Lankan mobile number.",
        },
        { status: 400 }
      );
    }

    if (
      !requestId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        requestId
      )
    ) {
      return NextResponse.json(
        {
          error: "A valid spin request ID is required.",
        },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc(
      "play_spin",
      {
        p_campaign_game_id: campaignGameId,
        p_mobile_e164: mobile,
        p_request_id: requestId,
      }
    );

    if (error) {
      console.error("Spin RPC error:", error);

      const message = error.message || "";

      if (
        message.includes(
          "already played"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "This mobile number has already played.",
          },
          { status: 409 }
        );
      }

      if (
        message.includes(
          "not currently available"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "This game is not currently available.",
          },
          { status: 400 }
        );
      }

      if (
        message.includes(
          "No prizes are currently available"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "No prizes are currently available.",
          },
          { status: 409 }
        );
      }

      if (
        message.includes(
          "Prize inventory changed"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "That prize was just taken. Please try again.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: "Unable to complete the spin.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      result: data,
    });
  } catch (error) {
    console.error("Spin API error:", error);

    return NextResponse.json(
      {
        error: "Unable to process the spin.",
      },
      { status: 500 }
    );
  }
}
