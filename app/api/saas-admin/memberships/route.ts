import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getPlatformAdmin } from "../../../../lib/platform-auth";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const validId = (value: unknown) => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
const validRole = (value: unknown) => ["owner", "admin", "editor", "viewer"].includes(String(value));

async function requireOwner(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return { error: reply({ error: "Invalid request origin." }, 403) };
  const actor = await getPlatformAdmin();
  if (!actor || actor.role !== "owner") return { error: reply({ error: "Only Super Admins can manage workspace memberships." }, 403) };
  return { actor };
}

async function findUserIdByEmail(admin: ReturnType<typeof createSupabaseAdminClient>, email: string) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Unable to search customer logins.");
    const user = data.users.find(item => item.email?.toLowerCase() === email);
    if (user) return user.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

export async function POST(request: Request) {
  const auth = await requireOwner(request); if (auth.error) return auth.error;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return reply({ error: "Invalid request." }, 400); }
  const workspaceId = body.workspaceId;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body.role;
  if (!validId(workspaceId) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !validRole(role)) return reply({ error: "Enter a valid workspace, email and role." }, 400);
  const admin = createSupabaseAdminClient();
  try {
    const { data: workspace } = await admin.from("workspaces").select("id,status").eq("id", workspaceId).maybeSingle();
    if (!workspace || workspace.status !== "active") return reply({ error: "Choose an active customer workspace." }, 400);
    const userId = await findUserIdByEmail(admin, email);
    if (!userId) return reply({ error: "No customer login exists for this email. Create the account first." }, 404);
    const { error } = await admin.from("workspace_members").insert({ workspace_id: workspaceId, user_id: userId, role });
    if (error) return reply({ error: error.code === "23505" ? "This user is already a member of that workspace." : "Unable to add workspace membership." }, 409);
    return reply({ added: true, userId });
  } catch { return reply({ error: "Unable to search customer logins." }, 500); }
}

async function membershipExists(admin: ReturnType<typeof createSupabaseAdminClient>, workspaceId: string, userId: string) {
  const { data } = await admin.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", userId).maybeSingle();
  return data;
}

async function preventLastOwner(admin: ReturnType<typeof createSupabaseAdminClient>, workspaceId: string, userId: string) {
  const current = await membershipExists(admin, workspaceId, userId);
  if (current?.role !== "owner") return false;
  const { count } = await admin.from("workspace_members").select("user_id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("role", "owner");
  return (count ?? 0) <= 1;
}

export async function PATCH(request: Request) {
  const auth = await requireOwner(request); if (auth.error) return auth.error;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return reply({ error: "Invalid request." }, 400); }
  if (!validId(body.workspaceId) || !validId(body.userId)) return reply({ error: "Invalid workspace membership." }, 400);
  const workspaceId = body.workspaceId as string;
  const userId = body.userId as string;
  const admin = createSupabaseAdminClient();

  if (body.action === "activate" || body.action === "deactivate" || body.action === "reset-password") {
    const membership = await membershipExists(admin, workspaceId, userId);
    if (!membership) return reply({ error: "Workspace membership not found." }, 404);
    const { data: target, error: userError } = await admin.auth.admin.getUserById(userId);
    if (userError || !target.user) return reply({ error: "Customer login not found." }, 404);

    // Customer membership controls must never change a platform operator's sign-in.
    const { data: platformStaff, error: platformError } = await admin.from("platform_admins")
      .select("user_id").eq("user_id", userId).maybeSingle();
    if (platformError) return reply({ error: "Unable to verify this customer's access." }, 500);
    if (platformStaff) return reply({ error: "This login also has platform staff access. Manage it from Platform Staff." }, 409);

    if (body.action === "reset-password") {
      const temporaryPassword = `${randomBytes(12).toString("base64url")}Aa1!`;
      const { error } = await admin.auth.admin.updateUserById(userId, {
        password: temporaryPassword,
        app_metadata: { ...target.user.app_metadata, must_change_password: true },
      });
      if (error) return reply({ error: "Unable to reset this customer's password." }, 500);
      return reply({ reset: true, temporaryPassword });
    }

    const active = body.action === "activate";
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" });
    if (error) return reply({ error: `Unable to ${active ? "activate" : "deactivate"} this customer login.` }, 500);
    return reply({ active });
  }

  if (!validRole(body.role)) return reply({ error: "Invalid workspace membership." }, 400);
  const role = body.role as string;
  if (role !== "owner" && await preventLastOwner(admin, workspaceId, userId)) return reply({ error: "A workspace must keep at least one owner." }, 409);
  const { data, error } = await admin.from("workspace_members").update({ role }).eq("workspace_id", workspaceId).eq("user_id", userId).select("user_id").maybeSingle();
  if (error) return reply({ error: "Unable to update workspace role." }, 409);
  if (!data) return reply({ error: "Workspace membership not found." }, 404);
  return reply({ saved: true });
}

export async function DELETE(request: Request) {
  const auth = await requireOwner(request); if (auth.error) return auth.error;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return reply({ error: "Invalid request." }, 400); }
  if (!validId(body.workspaceId) || !validId(body.userId)) return reply({ error: "Invalid workspace membership." }, 400);
  const workspaceId = body.workspaceId as string;
  const userId = body.userId as string;
  const admin = createSupabaseAdminClient();
  if (await preventLastOwner(admin, workspaceId, userId)) return reply({ error: "A workspace must keep at least one owner." }, 409);
  const { data, error } = await admin.from("workspace_members").delete().eq("workspace_id", workspaceId).eq("user_id", userId).select("user_id").maybeSingle();
  if (error) return reply({ error: "Unable to remove workspace membership." }, 409);
  if (!data) return reply({ error: "Workspace membership not found." }, 404);
  return reply({ removed: true });
}
