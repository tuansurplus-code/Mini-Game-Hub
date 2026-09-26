import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

export async function POST(request: Request) {
  try {
    const { user, workspaceId, role } = await requireAdmin();

    if (!["owner", "admin", "editor"].includes(role)) {
      return NextResponse.json(
        { error: "You do not have permission to create games." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const type = String(body.type ?? "").trim();
    const description = String(body.description ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "Game name is required." },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "spin",
      "scratch",
      "pick-card",
      "slot",
      "quiz",
      "lucky-draw",
    ];

    if (!allowedTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid game type." },
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
        { error: "A valid game name is required." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data: game, error } = await supabase
      .from("games")
      .insert({
        workspace_id: workspaceId,
        name,
        slug,
        type,
        description: description || null,
        status: "draft",
        default_config: {},
        created_by: user.id,
      })
      .select(
        "id, name, slug, type, description, status, created_at"
      )
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { game },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create game error:", error);

    return NextResponse.json(
      { error: "Unable to create game." },
      { status: 500 }
    );
  }
}
