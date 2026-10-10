import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

function validOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const { workspaceId, role } = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data: members, error: membersError } = await supabase
    .rpc("get_workspace_team_members", { p_workspace_id: workspaceId });
  if (membersError) return jsonError("Unable to load workspace members.", 400);

  let invitations: unknown[] = [];
  if (role === "owner") {
    const { data, error } = await supabase
      .from("workspace_invitations")
      .select("id,email,role,created_at,expires_at,accepted_at,revoked_at")
      .eq("workspace_id", workspaceId)
      .is("revoked_at", null)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });
    if (error) return jsonError("Unable to load invitations.", 400);
    invitations = data ?? [];
  }
  return NextResponse.json({ members: members ?? [], invitations });
}

export async function POST(request: Request) {
  if (!validOrigin(request)) return jsonError("Invalid request origin.", 403);
  const { workspaceId, role, user } = await requireAdmin();
  if (role !== "owner") return jsonError("Only the workspace owner can invite people.", 403);

  let body: { email?: unknown; role?: unknown };
  try { body = await request.json(); } catch { return jsonError("Invalid request.", 400); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const memberRole = body.role;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError("Enter a valid email address.", 400);
  }
  if (memberRole !== "admin" && memberRole !== "editor") {
    return jsonError("Choose Admin or Editor.", 400);
  }

  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const { data: existing, error: lookupError } = await supabase
    .from("workspace_invitations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", now.toISOString())
    .maybeSingle();
  if (lookupError) return jsonError("Unable to check existing invitations.", 400);
  if (existing) return jsonError("There is already an active invitation for this email. Revoke it before sending another.", 409);

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const id = randomUUID();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const { error } = await supabase.from("workspace_invitations").insert({
    id,
    workspace_id: workspaceId,
    email,
    role: memberRole,
    token_hash: tokenHash,
    invited_by: user.id,
    expires_at: expiresAt.toISOString(),
  });
  if (error) return jsonError("Unable to create the invitation. Please try again.", 400);

  const invitationUrl = new URL(`/invite/${id}`, new URL(request.url).origin);
  invitationUrl.searchParams.set("token", token);
  return NextResponse.json({ invitationUrl: invitationUrl.toString(), email, role: memberRole, expiresAt: expiresAt.toISOString() }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!validOrigin(request)) return jsonError("Invalid request origin.", 403);
  const { workspaceId, role } = await requireAdmin();
  if (role !== "owner") return jsonError("Only the workspace owner can change team roles.", 403);
  let body: { userId?: unknown; role?: unknown };
  try { body = await request.json(); } catch { return jsonError("Invalid request.", 400); }
  if (typeof body.userId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.userId) ||
      (body.role !== "admin" && body.role !== "editor")) {
    return jsonError("Invalid team member or role.", 400);
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("workspace_members")
    .update({ role: body.role })
    .eq("workspace_id", workspaceId)
    .eq("user_id", body.userId)
    .neq("role", "owner")
    .select("user_id")
    .maybeSingle();
  if (error || !data) return jsonError("Unable to update this member. The workspace owner cannot be changed.", 400);
  return NextResponse.json({ updated: true });
}

export async function DELETE(request: Request) {
  if (!validOrigin(request)) return jsonError("Invalid request origin.", 403);
  const { workspaceId, role } = await requireAdmin();
  if (role !== "owner") return jsonError("Only the workspace owner can remove team access.", 403);
  let body: { invitationId?: unknown; userId?: unknown };
  try { body = await request.json(); } catch { return jsonError("Invalid request.", 400); }
  const supabase = await createSupabaseServerClient();

  if (typeof body.invitationId === "string" && /^[0-9a-f-]{36}$/i.test(body.invitationId)) {
    const { data, error } = await supabase.from("workspace_invitations").delete()
      .eq("workspace_id", workspaceId).eq("id", body.invitationId).select("id").maybeSingle();
    if (error || !data) return jsonError("Unable to revoke this invitation.", 400);
    return NextResponse.json({ revoked: true });
  }
  if (typeof body.userId === "string" && /^[0-9a-f-]{36}$/i.test(body.userId)) {
    const { data, error } = await supabase.from("workspace_members").delete()
      .eq("workspace_id", workspaceId).eq("user_id", body.userId).neq("role", "owner")
      .select("user_id").maybeSingle();
    if (error || !data) return jsonError("Unable to remove this member. The workspace owner cannot be removed.", 400);
    return NextResponse.json({ removed: true });
  }
  return jsonError("Choose an invitation or team member to remove.", 400);
}
