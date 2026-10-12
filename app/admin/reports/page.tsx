import Link from "next/link";
import { requireAdmin } from "../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { hasWorkspacePlanFeature } from "../../../lib/game-template-access";
import ReportsDashboard, { type CampaignOption } from "./ReportsDashboard";

export default async function ReportsPage() {
  const { workspaceId } = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const reportsEnabled = await hasWorkspacePlanFeature(supabase, workspaceId, "advanced_reports");

  if (!reportsEnabled) {
    return (
      <div>
        <div className="admin-header">
          <div><div className="eyebrow">PLAN FEATURE</div><h1>Advanced reports</h1><p>Detailed campaign reporting and exports are not included in your current plan.</p></div>
        </div>
        <section className="admin-panel">
          <h2>Upgrade to access reports</h2>
          <p>Ask your workspace owner to review the current plan and available upgrades.</p>
          <Link className="primary-btn" href="/admin/billing">Review plan</Link>
        </section>
      </div>
    );
  }

  const { data } = await supabase
    .from("campaigns")
    .select("id, name, status")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const campaigns = (data ?? []) as CampaignOption[];

  return (
    <ReportsDashboard
      workspaceId={workspaceId}
      campaigns={campaigns}
    />
  );
}
