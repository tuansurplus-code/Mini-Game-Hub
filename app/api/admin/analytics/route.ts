import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";
import { getWorkspaceCampaignAnalytics, normalizeGtmContainerId } from "../../../../lib/workspace-analytics";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  try {
    const { workspaceId, role } = await requireAdmin();
    const supabase = createSupabaseAdminClient();
    const analytics = await getWorkspaceCampaignAnalytics(supabase, workspaceId);
    return json({ analytics, canEdit: role === "owner" || role === "admin" });
  } catch (error) {
    console.error("Load campaign analytics settings error:", error);
    return json({ error: "Unable to load campaign analytics settings." }, 500);
  }
}

export async function PATCH(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Invalid request origin." }, 403);
  try {
    const { workspaceId, role, user } = await requireAdmin();
    if (!["owner", "admin"].includes(role)) return json({ error: "Only workspace owners and admins can change analytics settings." }, 403);

    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
    if (typeof body.enabled !== "boolean") return json({ error: "Choose whether campaign analytics is enabled." }, 400);
    const containerId = normalizeGtmContainerId(body.containerId);
    if ((body.enabled && !containerId) || (typeof body.containerId === "string" && body.containerId.trim() && !containerId)) {
      return json({ error: "Enter a valid GTM container ID, such as GTM-ABC1234." }, 400);
    }

    const supabase = createSupabaseAdminClient();
    const analytics = await getWorkspaceCampaignAnalytics(supabase, workspaceId);
    if (!analytics.available) return json({ error: "Campaign analytics is not included in your current plan." }, 403);

    const { data: workspace, error: loadError } = await supabase.from("workspaces")
      .select("settings").eq("id", workspaceId).maybeSingle();
    if (loadError || !workspace) return json({ error: "Unable to load your workspace settings." }, 404);

    const settings = workspace.settings && typeof workspace.settings === "object" && !Array.isArray(workspace.settings)
      ? workspace.settings as Record<string, unknown>
      : {};
    const integrations = settings.integrations && typeof settings.integrations === "object" && !Array.isArray(settings.integrations)
      ? settings.integrations as Record<string, unknown>
      : {};
    const { error } = await supabase.from("workspaces").update({
      settings: {
        ...settings,
        integrations: {
          ...integrations,
          google_tag_manager: { enabled: body.enabled, container_id: containerId },
        },
      },
      updated_at: new Date().toISOString(),
    }).eq("id", workspaceId);
    if (error) {
      console.error("Save campaign analytics settings error:", error);
      return json({ error: "Unable to save campaign analytics settings." }, 500);
    }
    return json({ saved: true, analytics: { available: true, enabled: body.enabled, containerId }, updatedBy: user.id });
  } catch (error) {
    console.error("Save campaign analytics settings error:", error);
    return json({ error: "Unable to save campaign analytics settings." }, 500);
  }
}
