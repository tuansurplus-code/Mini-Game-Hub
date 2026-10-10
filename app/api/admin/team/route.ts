import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
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
  const { workspaceId, role } = await requireAdmin();
  if (role !== "owner") return jsonError("Only the workspace owner can create team accounts.", 403);

  let body: { email?: unknown; fullName?: unknown; role?: unknown };
  try { body = await request.json(); } catch { return jsonError("Invalid request.", 400); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const fullName = typeof body.fullName === "string" ? body.fullName.trim().slice(0, 120) : "";
  const memberRole = body.role;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError("Enter a valid email address.", 400);
  }
  if (!["admin", "editor", "viewer"].includes(String(memberRole))) {
    return jsonError("Choose Admin, Editor, or Viewer.", 400);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !secretKey) {
    return jsonError("Account creation is not configured. Add the server-only SUPABASE_SECRET_KEY in Vercel.", 503);
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const temporaryPassword = randomBytes(24).toString("base64url") + "aA1!";
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : {},
    app_metadata: { must_change_password: true },
  });
  if (createError || !created.user) {
    const alreadyExists = createError?.message.toLowerCase().includes("already") ||
      createError?.code === "email_exists";
    return jsonError(
      alreadyExists
        ? "An account already exists for this email. Remove the old invitation and ask the user to sign in first."
        : "Unable to create this account. Check the email address and try again.",
      alreadyExists ? 409 : 400,
    );
  }

  const { error: membershipError } = await admin.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: created.user.id,
    role: memberRole,
  });
  if (membershipError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return jsonError("The account was created but could not be added to this workspace. Please try again.", 500);
  }

  return NextResponse.json({
    created: true,
    email,
    fullName,
    role: memberRole,
    temporaryPassword,
    passwordChangeRequired: true,
  }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!validOrigin(request)) return jsonError("Invalid request origin.", 403);
  const { workspaceId, role } = await requireAdmin();
  if (role !== "owner") return jsonError("Only the workspace owner can change team roles.", 403);
  let body: { userId?: unknown; role?: unknown };
  try { body = await request.json(); } catch { return jsonError("Invalid request.", 400); }
  if (typeof body.userId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.userId) ||
      (body.role !== "admin" && body.role !== "editor" && body.role !== "viewer")) {
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
