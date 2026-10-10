import { requirePlatformAdmin } from "../../../lib/platform-auth";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import AccountManager from "./AccountManager";

export default async function AccountsPage() {
  const { role } = await requirePlatformAdmin();
  const supabase = await createSupabaseServerClient("platform");
  const { data, error } = await supabase.from("workspaces")
    .select("id,name,slug,status,created_at,workspace_members(count),campaigns(count),workspace_subscriptions(status,period_end,subscription_plans(name,slug))")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load customer accounts.");
  const initial = (data ?? []).map((workspace: any) => {
    const subscription = Array.isArray(workspace.workspace_subscriptions) ? workspace.workspace_subscriptions[0] : workspace.workspace_subscriptions;
    const plan = Array.isArray(subscription?.subscription_plans) ? subscription.subscription_plans[0] : subscription?.subscription_plans;
    return {
      id: workspace.id, name: workspace.name, slug: workspace.slug, status: workspace.status, created_at: workspace.created_at,
      memberCount: workspace.workspace_members?.[0]?.count ?? 0, campaignCount: workspace.campaigns?.[0]?.count ?? 0,
      planName: plan?.name ?? (subscription?.status === "grandfathered" ? "Grandfathered" : "—"),
      subscriptionStatus: subscription?.status, periodEnd: subscription?.period_end,
    };
  });
  return <>
    <div className="admin-header"><div><div className="eyebrow">CUSTOMERS</div><h1>Accounts</h1><p>Manage customer workspaces and their business owners.</p></div></div>
    <AccountManager initial={initial} canManage={role === "owner"} />
  </>;
}
