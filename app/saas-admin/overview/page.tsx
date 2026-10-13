import { requirePlatformAdmin } from "../../../lib/platform-auth";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { localDate, shiftDate, type Report } from "../usage/report-utils";
import Dashboard, { type DashboardData } from "./Dashboard";
import "./overview.css";

export const dynamic = "force-dynamic";

export default async function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const period = ["7", "30", "90"].includes(String(params.period)) ? Number(params.period) : 30;
  const today = localDate();
  const from = shiftDate(today, 1 - period);
  const supabase = await createSupabaseServerClient("platform");
  const results = await Promise.all([
    supabase.rpc("get_platform_usage_report", { p_from: from, p_to: today }),
    supabase.from("workspace_members").select("user_id", { count: "exact", head: true }),
    supabase.from("campaign_games").select("id", { count: "exact", head: true }),
    supabase.from("subscription_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("workspaces").select("id,name,status,created_at", { count: "exact" })
      .gte("created_at", `${from}T00:00:00+05:30`).lt("created_at", `${shiftDate(today, 1)}T00:00:00+05:30`)
      .order("created_at", { ascending: false }).order("id").limit(5),
  ]);
  const failed = results.some(r => r.error) || !results[0].data || results.slice(1).some(r => r.count === null);
  if (failed) {
    results.forEach((r, i) => { if (r.error) console.error("SaaS overview query failed", i, r.error.code, r.error.message); });
    return <Dashboard data={null} period={period} from={from} today={today} />;
  }
  const data: DashboardData = {
    report: results[0].data as Report,
    memberships: results[1].count!, campaignGames: results[2].count!, pendingRequests: results[3].count!,
    newAccountCount: results[4].count!, newAccounts: results[4].data ?? [],
  };
  return <Dashboard data={data} period={period} from={from} today={today} />;
}
