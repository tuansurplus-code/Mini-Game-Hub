import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getPlatformAdmin } from "../../../../lib/platform-auth";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const validId = (value: unknown) => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
const validSlug = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length >= 3 && value.length <= 60;

async function requireOwner(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return { error: reply({ error: "Invalid request origin." }, 403) };
  const actor = await getPlatformAdmin();
  if (!actor || actor.role !== "owner") return { error: reply({ error: "Only Super Admins can manage customer accounts." }, 403) };
  return { actor };
}

export async function POST(request: Request) {
  const auth = await requireOwner(request); if (auth.error) return auth.error;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return reply({ error: "Invalid request." }, 400); }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!name || name.length > 120 || !validSlug(slug) || !fullName || fullName.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return reply({ error: "Enter a valid workspace name, URL, owner name and email." }, 400);
  }

  const admin = createSupabaseAdminClient();
  const password = `${randomBytes(24).toString("base64url")}aA1!`;
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: fullName }, app_metadata: { must_change_password: true },
  });
  if (authError || !created.user) return reply({ error: "Unable to create the customer login. This email may already be registered." }, 409);

  const { data: workspace, error: workspaceError } = await admin.from("workspaces")
    .insert({ name, slug, owner_user_id: created.user.id, status: "active" })
    .select("id,name,slug,status,created_at")
    .single();
  if (workspaceError || !workspace) {
    await admin.auth.admin.deleteUser(created.user.id);
    return reply({ error: "Unable to create this workspace. Check that its URL is unique." }, 409);
  }

  const { error: membershipError } = await admin.from("workspace_members")
    .insert({ workspace_id: workspace.id, user_id: created.user.id, role: "owner" });
  if (membershipError) {
    await admin.from("workspaces").delete().eq("id", workspace.id);
    await admin.auth.admin.deleteUser(created.user.id);
    return reply({ error: "Unable to set up the customer workspace owner." }, 500);
  }
  return reply({ workspace, credentials: { email, password } }, 201);
}

export async function PATCH(request: Request) {
  const auth = await requireOwner(request); if (auth.error) return auth.error;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return reply({ error: "Invalid request." }, 400); }
  const id = body.id;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const status = body.status;
  if (!validId(id) || !name || name.length > 120 || !validSlug(slug) || !["active", "suspended", "disabled"].includes(String(status))) {
    return reply({ error: "Enter a valid workspace name, URL and status." }, 400);
  }
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("workspaces").update({ name, slug, status, updated_at: new Date().toISOString() })
    .eq("id", id).select("id,name,slug,status,created_at").maybeSingle();
  if (error) return reply({ error: "Unable to save this customer account. Check that its URL is unique." }, 409);
  if (!data) return reply({ error: "Customer account not found." }, 404);
  return reply({ workspace: data });
}

export async function DELETE(request: Request) {
  const auth = await requireOwner(request); if (auth.error) return auth.error;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return reply({ error: "Invalid request." }, 400); }
  if (!validId(body.id)) return reply({ error: "Invalid customer account." }, 400);
  // Preserve customer campaigns, rewards, and billing history; removal from the platform is reversible.
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("workspaces").update({ status: "disabled", updated_at: new Date().toISOString() })
    .eq("id", body.id).select("id").maybeSingle();
  if (error) return reply({ error: "Unable to disable this customer account." }, 409);
  if (!data) return reply({ error: "Customer account not found." }, 404);
  return reply({ disabled: true });
}
