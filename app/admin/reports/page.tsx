import Link from "next/link";
import { requireAdmin } from "../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

export default async function ReportsPage() {
  const { user, workspaceId, role } = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const campaignsQuery = supabase.from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (role !== "viewer") campaignsQuery.eq("created_by", user.id);
  const { count } = await campaignsQuery;

  return <>
    <div className="admin-header">
      <div>
        <div className="eyebrow">ANALYTICS</div>
        <h1>Reports</h1>
        <p>Workspace reporting and campaign performance.</p>
      </div>
    </div>
    <div className="admin-panel">
      <h2>{count ?? 0} campaigns available in this workspace</h2>
      <p style={{ color: "#6b7280" }}>Review game results and download a CSV report from Winner History.</p>
      <Link className="primary-btn" href="/admin/winners">Open Winner History and download report</Link>
    </div>
  </>;
}
