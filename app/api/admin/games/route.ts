import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

export async function GET() {
  try {
    const { workspaceId, role } = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const [{ data: games, error: gamesError }, { data: assignments, error: assignmentsError }] = await Promise.all([
      supabase.from("games").select("id,name,slug,type,status").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
      supabase.from("campaign_games").select("game_id,campaigns!inner(status,workspace_id)").eq("campaigns.workspace_id", workspaceId),
    ]);
    if (gamesError || assignmentsError) {
      return NextResponse.json({ error: gamesError?.message || assignmentsError?.message || "Unable to load games." }, { status: 400 });
    }
    const rows = assignments ?? [];
    const result = (games ?? []).map(game => {
      const linked = rows.filter(row => row.game_id === game.id);
      const live = linked.some(row => {
        const campaign = Array.isArray(row.campaigns) ? row.campaigns[0] : row.campaigns;
        return campaign?.status === "active";
      });
      return { ...game, status: live ? "live" : linked.length ? "assigned" : "draft" };
    });
    return NextResponse.json({ role, games: result });
  } catch (error) {
    console.error("Load games error:", error);
    return NextResponse.json({ error: "Unable to load games." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, workspaceId, role } = await requireAdmin();
    if (!["owner", "admin", "editor"].includes(role)) return NextResponse.json({ error: "You do not have permission to create games." }, { status: 403 });
    const body = await request.json();
    const name = String(body.name ?? "").trim(), type = String(body.type ?? "").trim(), description = String(body.description ?? "").trim();
    if (!name) return NextResponse.json({ error: "Game name is required." }, { status: 400 });
    const allowedTypes = ["spin", "scratch", "pick-card", "slot", "quiz", "lucky-draw"];
    if (!allowedTypes.includes(type)) return NextResponse.json({ error: "Invalid game type." }, { status: 400 });
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!slug) return NextResponse.json({ error: "A valid game name is required." }, { status: 400 });
    const supabase = await createSupabaseServerClient();
    const { data: game, error } = await supabase.from("games").insert({ workspace_id: workspaceId, name, slug, type, description: description || null, status: "draft", default_config: {}, created_by: user.id }).select("id, name, slug, type, description, status, created_at").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ game }, { status: 201 });
  } catch (error) { console.error("Create game error:", error); return NextResponse.json({ error: "Unable to create game." }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const { workspaceId, role } = await requireAdmin();
    if (!["owner", "admin"].includes(role)) return NextResponse.json({ error: "Only owners and admins can delete games." }, { status: 403 });
    const id = new URL(request.url).searchParams.get("id")?.trim();
    if (!id) return NextResponse.json({ error: "Game ID is required." }, { status: 400 });
    const supabase = await createSupabaseServerClient();
    const { data: game } = await supabase.from("games").select("id").eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
    if (!game) return NextResponse.json({ error: "Game not found." }, { status: 404 });
    const { count, error: countError } = await supabase.from("campaign_games").select("id", { count: "exact", head: true }).eq("game_id", id);
    if (countError) return NextResponse.json({ error: countError.message }, { status: 400 });
    if ((count ?? 0) > 0) return NextResponse.json({ error: "This game is assigned to a campaign. Remove it from all campaigns before deleting it." }, { status: 409 });
    const { error } = await supabase.from("games").delete().eq("id", id).eq("workspace_id", workspaceId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ deleted: true });
  } catch (error) { console.error("Delete game error:", error); return NextResponse.json({ error: "Unable to delete game." }, { status: 500 }); }
}
