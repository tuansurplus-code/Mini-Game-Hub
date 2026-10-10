import { requirePlatformAdmin } from "../../../lib/platform-auth";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";

export default async function WorkspaceMembershipsPage() {
  await requirePlatformAdmin();
  const supabase = await createSupabaseServerClient("platform");
  const { data, error } = await supabase.from("workspace_members")
    .select("user_id,role,created_at,workspaces(name,slug,status)").order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load customer workspace memberships.");

  const authAdmin = createSupabaseAdminClient();
  const memberships = await Promise.all((data ?? []).map(async (membership: any) => {
    const { data: result } = await authAdmin.auth.admin.getUserById(membership.user_id);
    const workspace = Array.isArray(membership.workspaces) ? membership.workspaces[0] : membership.workspaces;
    return { ...membership, email: result.user?.email ?? "Unavailable", workspace };
  }));

  return <>
    <div className="admin-header"><div><div className="eyebrow">CUSTOMER ACCESS</div><h1>Workspace Memberships</h1><p>Customer accounts and their roles inside each business workspace.</p></div></div>
    <div className="admin-panel" style={{ overflowX: "auto" }}>
      <table className="admin-table" style={{ minWidth: 720 }}>
        <thead><tr><th>Customer account</th><th>Workspace</th><th>Workspace role</th><th>Workspace status</th><th>Joined</th></tr></thead>
        <tbody>{memberships.map((membership: any) => <tr key={`${membership.workspace_id}-${membership.user_id}`}>
          <td>{membership.email}</td><td><strong>{membership.workspace?.name ?? "Unknown"}</strong><br /><small>{membership.workspace?.slug ?? ""}</small></td>
          <td style={{ textTransform: "capitalize" }}>{membership.role}</td><td>{membership.workspace?.status ?? "Unknown"}</td>
          <td>{new Date(membership.created_at).toLocaleDateString("en-LK")}</td>
        </tr>)}</tbody>
      </table>
      {!memberships.length && <p>No customer workspace memberships yet.</p>}
    </div>
  </>;
}
