import { requirePlatformAdmin } from "../../../lib/platform-auth";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";
import MembershipManager, { Membership } from "./MembershipManager";

export default async function WorkspaceMembershipsPage() {
  const { role } = await requirePlatformAdmin();
  const supabase = await createSupabaseServerClient("platform");
  const [{ data, error }, { data: workspaces, error: workspaceError }] = await Promise.all([
    supabase.from("workspace_members").select("workspace_id,user_id,role,created_at,workspaces(name,slug,status)").order("created_at", { ascending: false }),
    supabase.from("workspaces").select("id,name,slug").order("name"),
  ]);
  if (error || workspaceError) throw new Error("Unable to load customer workspace memberships.");
  const authAdmin = createSupabaseAdminClient();
  const memberships = await Promise.all((data ?? []).map(async (membership: any) => {
    const { data: result } = await authAdmin.auth.admin.getUserById(membership.user_id);
    const workspace = Array.isArray(membership.workspaces) ? membership.workspaces[0] : membership.workspaces;
    const bannedUntil = result.user?.banned_until ? new Date(result.user.banned_until).getTime() : null;
    const loginStatus = !result.user ? "unknown" : bannedUntil !== null && bannedUntil > Date.now() ? "deactivated" : "active";
    return { user_id: membership.user_id, email: result.user?.email ?? "Unavailable", workspace_id: membership.workspace_id,
      workspace_name: workspace?.name ?? "Unknown", workspace_slug: workspace?.slug ?? "", workspace_status: workspace?.status ?? "Unknown",
      login_status: loginStatus, role: membership.role, created_at: membership.created_at } as Membership;
  }));
  return <>
    <div className="admin-header"><div><div className="eyebrow">CUSTOMER ACCESS</div><h1>Workspace Memberships</h1><p>Manage customer users and their roles inside each business workspace.</p></div></div>
    <MembershipManager initial={memberships} workspaces={workspaces ?? []} canManage={role === "owner"} />
  </>;
}
