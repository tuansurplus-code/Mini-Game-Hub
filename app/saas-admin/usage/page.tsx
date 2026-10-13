import { requirePlatformAdmin } from "../../../lib/platform-auth";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

type QueryValue = string | string[] | undefined;
type Workspace = { id: string; name: string; status: string; created_at: string; workspace_subscriptions: any };
type Campaign = { id: string; workspace_id: string; status: string };
type Session = { id: string; participant_id: string | null; status: string; started_at: string; completed_at: string | null; campaign_games: any; winners: any };
type WorkspaceUsage = {
  id: string; name: string; status: string; plan: string; planSlug: string; subscriptionStatus: string;
  campaigns: number; activeCampaigns: number; sessions: number; participants: Set<string>;
  winners: number; coupons: number; redeemed: number;
};

function valueOf(value: QueryValue) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
function colomboDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (key: string) => parts.find((item) => item.type === key)?.value ?? "";
  return part("year") + "-" + part("month") + "-" + part("day");
}
function toTimestamp(date: string, nextDay = false) {
  const result = new Date(date + "T00:00:00+05:30");
  if (nextDay) result.setUTCDate(result.getUTCDate() + 1);
  return result.toISOString();
}
function escapeCsv(value: string | number) {
  const raw = String(value);
  const safe = /^[\t\r ]*[=+\-@]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}
function number(value: number) {
  return new Intl.NumberFormat("en-LK").format(value);
}
function relation(value: any) {
  return first(value);
}

export default async function UsagePage({ searchParams }: { searchParams: Promise<Record<string, QueryValue>> }) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const today = colomboDate(new Date());
  const defaultFromDate = new Date(today + "T00:00:00Z");
  defaultFromDate.setUTCDate(defaultFromDate.getUTCDate() - 29);
  const from = valueOf(params.from) || colomboDate(defaultFromDate);
  const to = valueOf(params.to) || today;
  const selectedWorkspace = valueOf(params.workspace);
  const selectedPlan = valueOf(params.plan);
  const invalidDates = !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to;
  const supabase = await createSupabaseServerClient("platform");

  const [{ data: workspaceData, error: workspaceError }, { data: campaignData, error: campaignError }] = await Promise.all([
    supabase.from("workspaces")
      .select("id,name,status,created_at,workspace_subscriptions(status,subscription_plans(name,slug))")
      .order("created_at", { ascending: false }),
    supabase.from("campaigns")
      .select("id,workspace_id,status")
      .order("created_at", { ascending: false }),
  ]);
  const workspaces = (workspaceData ?? []) as Workspace[];
  const campaigns = (campaignData ?? []) as Campaign[];
  const reportError = workspaceError || campaignError;
  const sessions: Session[] = [];
  let sessionError = "";

  if (!reportError && !invalidDates) {
    let offset = 0;
    const pageSize = 1000;
    while (true) {
      let query = supabase.from("game_sessions")
        .select("id,participant_id,status,started_at,completed_at,campaign_games!inner(campaign_id,campaigns!inner(workspace_id)),winners(id,coupons(status))")
        .gte("started_at", toTimestamp(from))
        .lt("started_at", toTimestamp(to, true))
        .order("started_at", { ascending: false })
        .range(offset, offset + pageSize - 1);
      const { data, error } = await query;
      if (error) {
        sessionError = "Unable to load game session activity. Please refresh and try again.";
        break;
      }
      const page = (data ?? []) as Session[];
      sessions.push(...page);
      if (page.length < pageSize) break;
      offset += pageSize;
    }
  }

  const rawRows = new Map<string, WorkspaceUsage>();
  for (const workspace of workspaces) {
    const subscription = relation(workspace.workspace_subscriptions);
    const plan = relation(subscription?.subscription_plans);
    rawRows.set(workspace.id, {
      id: workspace.id,
      name: workspace.name,
      status: workspace.status,
      plan: plan?.name ?? (subscription?.status === "grandfathered" ? "Grandfathered" : "No plan"),
      planSlug: plan?.slug ?? (subscription?.status === "grandfathered" ? "grandfathered" : "none"),
      subscriptionStatus: subscription?.status ?? "—",
      campaigns: 0,
      activeCampaigns: 0,
      sessions: 0,
      participants: new Set<string>(),
      winners: 0,
      coupons: 0,
      redeemed: 0,
    });
  }
  for (const campaign of campaigns) {
    const row = rawRows.get(campaign.workspace_id);
    if (row) {
      row.campaigns += 1;
      if (campaign.status === "active") row.activeCampaigns += 1;
    }
  }
  for (const session of sessions) {
    const campaignGame = relation(session.campaign_games);
    const campaign = relation(campaignGame?.campaigns);
    const row = campaign?.workspace_id ? rawRows.get(campaign.workspace_id) : null;
    if (!row) continue;
    row.sessions += 1;
    if (session.participant_id) row.participants.add(session.participant_id);
    const winnerRows = Array.isArray(session.winners) ? session.winners : session.winners ? [session.winners] : [];
    row.winners += winnerRows.length;
    for (const winner of winnerRows) {
      const coupons = Array.isArray(winner.coupons) ? winner.coupons : winner.coupons ? [winner.coupons] : [];
      row.coupons += coupons.length;
      row.redeemed += coupons.filter((coupon: any) => coupon.status === "redeemed").length;
    }
  }

  const filteredRows = [...rawRows.values()]
    .filter((row) => !selectedWorkspace || row.id === selectedWorkspace)
    .filter((row) => !selectedPlan || row.planSlug === selectedPlan)
    .sort((a, b) => a.name.localeCompare(b.name));
  const totals = filteredRows.reduce((sum, row) => ({
    workspaces: sum.workspaces + (row.status === "active" ? 1 : 0),
    campaigns: sum.campaigns + row.activeCampaigns,
    sessions: sum.sessions + row.sessions,
    participants: sum.participants + row.participants.size,
    winners: sum.winners + row.winners,
    redeemed: sum.redeemed + row.redeemed,
  }), { workspaces: 0, campaigns: 0, sessions: 0, participants: 0, winners: 0, redeemed: 0 });
  const plans = new Map<string, { workspaces: number; sessions: number; campaigns: number; winners: number }>();
  for (const row of filteredRows) {
    const existing = plans.get(row.plan) ?? { workspaces: 0, sessions: 0, campaigns: 0, winners: 0 };
    existing.workspaces += 1;
    existing.sessions += row.sessions;
    existing.campaigns += row.activeCampaigns;
    existing.winners += row.winners;
    plans.set(row.plan, existing);
  }

  const daily = new Map<string, number>();
  for (const session of sessions) {
    const day = colomboDate(new Date(session.started_at));
    daily.set(day, (daily.get(day) ?? 0) + 1);
  }
  const trendEnd = new Date(to + "T00:00:00Z");
  const requestedStart = new Date(from + "T00:00:00Z");
  const chartStart = new Date(trendEnd);
  chartStart.setUTCDate(chartStart.getUTCDate() - 13);
  if (requestedStart > chartStart) chartStart.setTime(requestedStart.getTime());
  const trendDays: { date: string; count: number }[] = [];
  for (const cursor = new Date(chartStart); cursor <= trendEnd; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = cursor.toISOString().slice(0, 10);
    trendDays.push({ date, count: daily.get(date) ?? 0 });
  }
  const maxDaily = Math.max(1, ...trendDays.map((day) => day.count));
  const planOptions = [...new Map<string, string>([...rawRows.values()].map((row) => [row.planSlug, row.plan] as const)).entries()]
    .sort((a, b) => a[1].localeCompare(b[1]));

  const csvFields: [string, (row: WorkspaceUsage) => string | number][] = [
    ["Workspace", (row) => row.name],
    ["Status", (row) => row.status],
    ["Plan", (row) => row.plan],
    ["Subscription Status", (row) => row.subscriptionStatus],
    ["Active Campaigns", (row) => row.activeCampaigns],
    ["All Campaigns", (row) => row.campaigns],
    ["Game Sessions", (row) => row.sessions],
    ["Unique Players", (row) => row.participants.size],
    ["Winners", (row) => row.winners],
    ["Coupons Redeemed", (row) => row.redeemed],
  ];
  const csv = "\uFEFF" + csvFields.map(([label]) => escapeCsv(label)).join(",") + "\n" +
    filteredRows.map((row) => csvFields.map(([, get]) => escapeCsv(get(row))).join(",")).join("\n");
  const csvHref = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);

  return <div>
    <header className="admin-header">
      <div><div className="eyebrow">PLATFORM ACTIVITY</div><h1>Usage &amp; Reports</h1><p>Platform-wide campaign and game activity across customer workspaces.</p></div>
      <a className="secondary-btn" href={csvHref} download={"platform-usage-" + from + "-to-" + to + ".csv"}>Export CSV</a>
    </header>

    {reportError && <div className="error-box">Unable to load platform usage data. Please refresh and try again.</div>}
    {sessionError && <div className="error-box">{sessionError}</div>}
    {invalidDates && <div className="error-box">Select valid start and end dates. The start date must be on or before the end date.</div>}

    <form method="get" className="admin-panel" style={{ marginBottom: 18, display: "flex", alignItems: "end", gap: 12, flexWrap: "wrap" }}>
      <label style={{ display: "grid", gap: 5, minWidth: 155, flex: "1 1 155px" }}>From
        <input type="date" name="from" value={from} max={today} required style={inputStyle} />
      </label>
      <label style={{ display: "grid", gap: 5, minWidth: 155, flex: "1 1 155px" }}>To
        <input type="date" name="to" value={to} min={from} max={today} required style={inputStyle} />
      </label>
      <label style={{ display: "grid", gap: 5, minWidth: 210, flex: "1 1 210px" }}>Workspace
        <select name="workspace" defaultValue={selectedWorkspace} style={inputStyle}>
          <option value="">All workspaces</option>
          {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
        </select>
      </label>
      <label style={{ display: "grid", gap: 5, minWidth: 155, flex: "1 1 155px" }}>Plan
        <select name="plan" defaultValue={selectedPlan} style={inputStyle}>
          <option value="">All plans</option>
          {planOptions.map(([slug, label]) => <option key={slug} value={slug}>{label}</option>)}
        </select>
      </label>
      <button className="primary-btn" type="submit">Apply filters</button>
      <a className="secondary-btn" href="/saas-admin/usage">Reset</a>
      <span style={{ color: "var(--admin-muted)", fontSize: 12 }}>Dates use Sri Lanka time.</span>
    </form>

    <section className="admin-grid" aria-label="Usage summary">
      {[
        ["Active Workspaces", totals.workspaces],
        ["Active Campaigns", totals.campaigns],
        ["Game Sessions", totals.sessions],
        ["Unique Players", totals.participants],
        ["Winners", totals.winners],
        ["Coupons Redeemed", totals.redeemed],
      ].map(([label, value]) => <article className="admin-panel" key={String(label)}>
        <div className="eyebrow">{label}</div><h2 style={{ fontSize: 30, margin: "8px 0 0" }}>{number(Number(value))}</h2>
      </article>)}
    </section>

    <section className="admin-panel" style={{ marginTop: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, flexWrap: "wrap" }}>
        <div><h2 style={{ margin: 0 }}>Daily game sessions</h2><p style={{ color: "var(--admin-muted)", margin: "5px 0 0" }}>Showing up to 14 days within the selected period.</p></div>
        <strong>{from} to {to}</strong>
      </div>
      {trendDays.length === 0 ? <p className="empty">No dates to display.</p> : <div style={{ display: "grid", gridTemplateColumns: "repeat(14,minmax(18px,1fr))", gap: 8, alignItems: "end", minHeight: 150, paddingTop: 16, overflowX: "auto" }}>
        {trendDays.map((day) => <div key={day.date} title={day.date + ": " + number(day.count) + " sessions"} style={{ minWidth: 18, display: "grid", gridTemplateRows: "1fr auto", gap: 7, textAlign: "center", height: 130 }}>
          <div style={{ display: "flex", alignItems: "end", height: 105, borderBottom: "1px solid var(--admin-border)" }}><div style={{ width: "100%", minHeight: 3, height: Math.max(3, day.count / maxDaily * 100) + "%", background: "var(--admin-accent, #2563eb)", borderRadius: "5px 5px 0 0" }} /></div>
          <span style={{ fontSize: 10, color: "var(--admin-muted)" }}>{day.date.slice(5)}</span>
        </div>)}
      </div>}
    </section>

    <section className="admin-panel" style={{ marginTop: 18 }}>
      <h2 style={{ marginTop: 0 }}>Usage by plan</h2>
      {plans.size === 0 ? <p className="empty">No workspaces match these filters.</p> : <div className="overflow-x-auto"><table>
        <thead><tr><th>Plan</th><th>Workspaces</th><th>Active Campaigns</th><th>Game Sessions</th><th>Winners</th></tr></thead>
        <tbody>{[...plans.entries()].sort((a, b) => b[1].sessions - a[1].sessions).map(([plan, metrics]) => <tr key={plan}>
          <td><strong>{plan}</strong></td><td>{number(metrics.workspaces)}</td><td>{number(metrics.campaigns)}</td><td>{number(metrics.sessions)}</td><td>{number(metrics.winners)}</td>
        </tr>)}</tbody>
      </table></div>}
    </section>

    <section className="admin-panel" style={{ marginTop: 18 }}>
      <h2 style={{ marginTop: 0 }}>Workspace usage</h2>
      <p style={{ color: "var(--admin-muted)", marginTop: -6 }}>Game sessions and player totals follow the selected dates. Campaign totals show the current workspace setup.</p>
      {filteredRows.length === 0 ? <p className="empty">No workspaces match these filters.</p> : <div className="overflow-x-auto"><table>
        <thead><tr><th>Workspace</th><th>Plan</th><th>Status</th><th>Active Campaigns</th><th>All Campaigns</th><th>Sessions</th><th>Unique Players</th><th>Winners</th><th>Redeemed</th></tr></thead>
        <tbody>{filteredRows.map((row) => <tr key={row.id}>
          <td><strong>{row.name}</strong></td><td>{row.plan}</td><td>{row.status}</td><td>{number(row.activeCampaigns)}</td><td>{number(row.campaigns)}</td>
          <td>{number(row.sessions)}</td><td>{number(row.participants.size)}</td><td>{number(row.winners)}</td><td>{number(row.redeemed)}</td>
        </tr>)}</tbody>
      </table></div>}
    </section>
  </div>;
}

const inputStyle = {
  width: "100%",
  minHeight: 40,
  padding: "8px 10px",
  border: "1px solid var(--admin-control-border)",
  borderRadius: 9,
  background: "var(--admin-control-bg)",
  color: "var(--admin-text)",
};