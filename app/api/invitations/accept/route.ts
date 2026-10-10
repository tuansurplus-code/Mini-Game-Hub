import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let body: { id?: unknown; token?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid invitation request." }, { status: 400 });
  }
  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id) ||
      typeof body.token !== "string" || !/^[A-Za-z0-9_-]{40,50}$/.test(body.token)) {
    return NextResponse.json({ error: "This invitation link is invalid." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Sign in with the invited email address to accept this invitation." }, { status: 401 });
  }

  const tokenHash = createHash("sha256").update(body.token).digest("hex");
  const { data: workspaceId, error } = await supabase.rpc("accept_workspace_invitation", {
    p_invitation_id: body.id,
    p_token_hash: tokenHash,
  });
  if (error || typeof workspaceId !== "string") {
    return NextResponse.json({ error: error?.message || "Unable to accept this invitation." }, { status: 400 });
  }

  const response = NextResponse.json({ accepted: true });
  response.cookies.set({
    name: "mini-game-hub-workspace",
    value: workspaceId,
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/admin",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
