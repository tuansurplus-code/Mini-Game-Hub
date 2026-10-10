import { requirePlatformAdmin } from "../../../lib/platform-auth";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

export default async function AccountsPage() {
  await requirePlatformAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("id,name,slug,status,created_at,workspace_members(count),campaigns(count),workspace_subscriptions(status,period_end,subscription_plans(name,slug))")
    .order("created_at", { ascending: false });

  if (error) throw new Error("Unable to load customer accounts.");

  return <>
    <div className="admin-header">
      <div>
        <div className="eyebrow">CUSTOMERS</div>
        <h1>Accounts</h1>
        <p>All registered business workspaces and their current plans.</p>
      </div>
    </div>
    <div className="admin-panel">
      <div style={{ overflowX: "auto" }}>
        <table className="admin-table" style={{ minWidth: 900, width: "100%" }}>
          <thead><tr><th>Workspace</th><th>Slug</th><th>Status</th><th>Plan</th><th>Members</th><th>Campaigns</th><th>Created</th></tr></thead>
          <tbody>{(data ?? []).map((workspace: any) => {
            const rawSubscription = workspace.workspace_subscriptions;
            const subscription = Array.isArray(rawSubscription) ? rawSubscription[0] : rawSubscription;
            const rawPlan = subscription?.subscription_plans;
            const plan = Array.isArray(rawPlan) ? rawPlan[0] : rawPlan;
            const planLabel = plan?.name ?? (subscription?.status === "grandfathered" ? "Grandfathered" : "—");
            return <tr key={workspace.id}>
              <td><strong>{workspace.name}</strong></td>
              <td>{workspace.slug}</td>
              <td><span className="status-pill">{workspace.status}</span></td>
              <td><strong>{planLabel}</strong>{subscription?.status && <div style={{ color: "#6b7280", fontSize: 12 }}>{subscription.status.replace(/_/g, " ")}{subscription.period_end ? ` · through ${new Date(subscription.period_end).toLocaleDateString("en-LK")}` : ""}</div>}</td>
              <td>{workspace.workspace_members?.[0]?.count ?? 0}</td>
              <td>{workspace.campaigns?.[0]?.count ?? 0}</td>
              <td>{new Date(workspace.created_at).toLocaleDateString("en-LK")}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      {!data?.length && <p>No customer accounts yet.</p>}
    </div>
  </>;
}
