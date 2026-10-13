import { requirePlatformAdmin } from "../../../lib/platform-auth";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import Reports from "./Reports";
import { localDate, shiftDate, validateFilters, views, type Filters, type Report } from "./report-utils";
import "./reports.css";

export const dynamic = "force-dynamic";

export default async function UsagePage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const value = (key: string) => { const v=params[key]; return Array.isArray(v) ? v[0] ?? "" : v ?? ""; };
  const today = localDate();
  const filters: Filters = { from:value("from") || shiftDate(today,-29), to:value("to") || today,
    workspace:value("workspace"), plan:value("plan"), campaign:value("campaign"), game:value("game"),
    view:views.includes(value("view") as typeof views[number]) ? value("view") : "overview" };
  let error = validateFilters(filters,today);
  let report: Report | null = null;
  if (!error) {
    const supabase = await createSupabaseServerClient("platform");
    const result = await supabase.rpc("get_platform_usage_report", {
      p_from:filters.from,p_to:filters.to,p_workspace:filters.workspace || null,p_plan:filters.plan || null,
      p_campaign:filters.campaign || null,p_game:filters.game || null,
    });
    if (result.error || !result.data) {
      console.error("Platform report query failed", result.error?.code, result.error?.message);
      error = "The report could not be loaded. Please try Apply filters again.";
    } else report = result.data as Report;
  }
  return <Reports key={JSON.stringify(filters)} report={report} filters={filters} today={today} error={error} />;
}
