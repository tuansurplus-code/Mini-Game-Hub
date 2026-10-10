import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  let body: { workspaceId?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body.workspaceId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.workspaceId)) {
    return NextResponse.json({ error: "Choose a valid workspace." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Sign in to change workspaces." }, { status: 401 });

  const { data, error } = await supabase.from("workspace_members")
    .select("workspace_id,role,workspaces!inner(status)")
    .eq("workspace_id", body.workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();
  const workspace = Array.isArray(data?.workspaces) ? data.workspaces[0] : data?.workspaces;
  if (error || !data || workspace?.status !== "active" || !["owner", "admin", "editor", "viewer"].includes(data.role)) {
    return NextResponse.json({ error: "You do not have access to that workspace." }, { status: 403 });
  }

  const response = NextResponse.json({ selected: true });
  response.cookies.set({
    name: "mini-game-hub-workspace",
    value: body.workspaceId,
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/admin",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
