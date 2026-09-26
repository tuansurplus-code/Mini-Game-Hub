import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

export async function POST(request: Request) {
  try {
    const { user, workspaceId, role } = await requireAdmin();

    if (!["owner", "admin", "editor"].includes(role)) {
      return NextResponse.json(
        { error: "You do not have permission to create campaigns." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const startsAt = body.starts_at || null;
    const endsAt = body.ends_at || null;

    if (!name) {
      return NextResponse.json(
        { error: "Campaign name is required." },
        { status: 400 }
      );
    }

    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      return NextResponse.json(
        { error: "End date must be after the start date." },
        { status: 400 }
      );
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!slug) {
      return NextResponse.json(
        { error: "A valid campaign name is required." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data: existingCampaign } = await supabase
      .from("campaigns")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("slug", slug)
      .maybeSingle();

    if (existingCampaign) {
      return NextResponse.json(
        { error: "A campaign with this name already exists." },
        { status: 409 }
      );
    }

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .insert({
        workspace_id: workspaceId,
        name,
        slug,
        status: "draft",
        starts_at: startsAt,
        ends_at: endsAt,
        settings: {},
        created_by: user.id,
      })
      .select(
        "id, name, slug, status, starts_at, ends_at, created_at"
      )
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { campaign },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create campaign error:", error);

    return NextResponse.json(
      { error: "Unable to create campaign." },
      { status: 500 }
    );
  }
}
