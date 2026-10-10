import { requireAdmin } from "../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import ReportsDashboard, { type CampaignOption } from "./ReportsDashboard";

export default async function ReportsPage() {
  const { workspaceId } = await requireAdmin();
  const supabase = await createSupabaseServerClient();
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
