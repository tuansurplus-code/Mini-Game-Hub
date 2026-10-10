import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getPlatformAdmin } from "../../../../lib/platform-auth";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";
import { isPlatformRole } from "../../../../lib/platform-roles";

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  const actor = await getPlatformAdmin();
  if (!actor) return reply({ error: "Platform access required." }, 403);
  const admin = createSupabaseAdminClient();
  const { data: staff, error } = await admin.from("platform_admins")
    .select("user_id,role,active,full_name,contact_number,created_at").order("created_at");
  if (error) return reply({ error: "Unable to load staff." }, 500);
  const rows = await Promise.all((staff ?? []).map(async row => {
    const { data, error } = await admin.auth.admin.getUserById(row.user_id);
    if (error) throw new Error("Unable to load staff identity.");
    return { ...row, email: data.user.email, password_change_required: data.user.app_metadata?.must_change_password === true };
  }));
  const { data: audit, error: auditError } = await admin.from("platform_staff_audit")
    .select("id,actor_id,target_id,action,before_state,after_state,created_at").order("created_at", { ascending: false }).limit(50);
  if (auditError) return reply({ error: "Unable to load staff history." }, 500);
  return reply({ staff: rows, audit: audit ?? [], canManage: actor.role === "owner", currentUserId: actor.user.id });
}

async function mutate(request: Request, create: boolean) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "Invalid request origin." }, 403);
  const actor = await getPlatformAdmin();
  if (!actor || actor.role !== "owner") return reply({ error: "Only Super Admins can manage platform staff." }, 403);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return reply({ error: "Invalid request." }, 400); }
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const contact = typeof body.contactNumber === "string" ? body.contactNumber.trim() : "";
  if (!fullName || fullName.length > 120) return reply({ error: "Enter a name up to 120 characters." }, 400);
  if (!/^[+\d\s()-]{7,25}$/.test(contact) || contact.replace(/\D/g, "").length < 7) return reply({ error: "Enter a valid contact number." }, 400);
  if (!isPlatformRole(body.role)) return reply({ error: "Choose a valid staff role." }, 400);
  if (!create && (typeof body.active !== "boolean" || typeof body.userId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.userId))) return reply({ error: "Invalid staff account." }, 400);
  const admin = createSupabaseAdminClient();
  let target = typeof body.userId === "string" ? body.userId : "";
  let temporaryPassword: string | null = null;
  let created = false;
  if (create) {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({ error: "Enter a valid email address." }, 400);
    temporaryPassword = randomBytes(24).toString("base64url") + "aA1!";
    const { data, error } = await admin.auth.admin.createUser({ email, password: temporaryPassword, email_confirm: true,
      user_metadata: { full_name: fullName }, app_metadata: { must_change_password: true } });
    if (error || !data.user) return reply({ error: "Unable to create this account. Use an email that is not already registered." }, 400);
    target = data.user.id;
    created = true;
  }
  const { error } = await admin.rpc("manage_platform_staff", {
    p_actor: actor.user.id, p_target: target, p_role: body.role,
    p_active: create ? true : body.active, p_full_name: fullName, p_contact_number: contact, p_create: create,
  });
  if (error) {
    if (created) {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(target);
      if (cleanupError) console.error("Staff setup cleanup failed for newly created account", target);
    }
    const safeMessages = ["The last active Super Admin cannot be demoted or disabled.", "Only active Super Admins can manage staff.", "Staff account not found."];
    return reply({ error: safeMessages.includes(error.message) ? error.message : "Unable to save staff access. Refresh and try again." }, 409);
  }
  return reply({ saved: true, temporaryPassword }, create ? 201 : 200);
}
export async function POST(request: Request) { return mutate(request, true); }
export async function PATCH(request: Request) { return mutate(request, false); }
