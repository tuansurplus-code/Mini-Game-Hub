import Link from "next/link";
import { AdminIcon, type AdminIconName } from "../../admin/AdminIcon";
import { buildModel, comparison, display, reportUrl, type Report, type Row } from "../usage/report-utils";

export type DashboardData = {
  report: Report;
  memberships: number;
  campaignGames: number;
  pendingRequests: number;
  newAccountCount: number;
  newAccounts: { id: string; name: string; status: string; created_at: string }[];
};

function Stat({ label, value, detail, icon, href }: { label: string; value: string | number; detail: string; icon: AdminIconName; href: string }) {
  return <Link href={href} className="admin-panel overview-stat"><span className="overview-stat-label">{label}<AdminIcon name={icon} /></span><strong>{display(value)}</strong><small>{detail}</small></Link>;
}

function SessionsChart({ rows }: { rows: Row[] }) {
  const max = Math.max(1, ...rows.flatMap(r => [Number(r.sessions), Number(r.previous_sessions)]));
  const x = (i: number) => 44 + i / Math.max(1, rows.length - 1) * 704;
  const y = (n: number) => 178 - n / max * 142;
  const path = (key: string) => rows.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(Number(r[key])).toFixed(1)}`).join(" ");
  return <div className="overview-chart"><svg viewBox="0 0 790 222" role="img" aria-label="Daily sessions for the selected period and the previous period. Exact values are available in Usage & Reports.">
    {[0, 0.5, 1].map(r => <g key={r}><line x1="44" x2="748" y1={y(max * r)} y2={y(max * r)} className="overview-gridline" /><text x="32" y={y(max * r) + 4} textAnchor="end">{(max * r).toFixed(max % 2 && r === 0.5 ? 1 : 0)}</text></g>)}
    <path d={path("previous_sessions")} className="overview-previous" /><path d={path("sessions")} className="overview-current" />
    {rows.map((r, i) => <g key={String(r.date)}><circle cx={x(i)} cy={y(Number(r.sessions))} r="3" className="overview-point"><title>{`${r.date}: ${r.sessions} sessions; ${r.previous_date}: ${r.previous_sessions} sessions`}</title></circle>{(i === 0 || i === rows.length - 1 || i % Math.ceil(rows.length / 5) === 0) && <text x={x(i)} y="208" textAnchor={i === 0 ? "start" : i === rows.length - 1 ? "end" : "middle"}>{String(r.date).slice(5)}</text>}</g>)}
  </svg><div className="overview-legend"><span><i />Selected period</span><span><i className="previous" />Previous period</span></div></div>;
}

function Attention({ label, count, detail, href, icon }: { label: string; count: number; detail: string; href: string; icon: AdminIconName }) {
  return <Link href={href} className="overview-attention"><span className="overview-attention-icon"><AdminIcon name={icon} /></span><span><b>{label}</b><small>{detail}</small></span><strong className={count ? "overview-attention-count has-items" : "overview-attention-count"}>{display(count)}</strong><span aria-hidden="true">→</span></Link>;
}

export default function Dashboard({ data, period, from, today }: { data: DashboardData | null; period: number; from: string; today: string }) {
  const reportLink = (view = "overview", changes: Record<string, string> = {}) => reportUrl({ from, to: today, workspace: "", plan: "", campaign: "", game: "", view, ...changes });
  const model = data ? buildModel(data.report) : null;
  const activeSubscriptions = model?.subscriptions.filter(w => w.subscription_status === "active" && (!w.period_end || Date.parse(String(w.period_end)) > Date.parse(data!.report.generated_at))) ?? [];
  const expiring = model?.subscriptions.filter(w => w.renewal === "Expires within 30 days") ?? [];
  const ended = model?.subscriptions.filter(w => w.renewal === "Period ended" && !["none", "grandfathered"].includes(String(w.subscription_status))) ?? [];
  const nearLimit = model?.workspaces.filter(w => ([['active_campaigns', 'campaign_limit'], ['monthly_players', 'monthly_limit'], ['team_members', 'team_limit']] as const).some(([used, limit]) => w[limit] !== null && (Number(w[limit]) === 0 ? Number(w[used]) > 0 : Number(w[used]) / Number(w[limit]) >= 0.9))) ?? [];
  const topWorkspaces = model ? [...model.workspaces].filter(w => Number(w.sessions) > 0).sort((a, b) => Number(b.sessions) - Number(a.sessions) || String(a.name).localeCompare(String(b.name))).slice(0, 5) : [];
  const games = model ? [...model.games].sort((a, b) => Number(b.sessions) - Number(a.sessions)) : [];
  const quickLinks: { label: string; detail: string; href: string; icon: AdminIconName }[] = [
    { label: "Customer accounts", detail: "Manage workspaces and access", href: "/saas-admin/accounts", icon: "team" },
    { label: "Game templates", detail: "Control games and customization", href: "/saas-admin/templates", icon: "template" },
    { label: "Homepage layout", detail: "Manage the public website", href: "/saas-admin/settings", icon: "website" },
    { label: "Contact submissions", detail: "Review customer enquiries", href: "/saas-admin/contact-submissions", icon: "contact" },
  ];
  return <div className="saas-overview">
    <header className="admin-header"><div><div className="eyebrow">PLATFORM OVERVIEW</div><h1>SaaS Overview</h1><p>Activity, customer accounts and the next actions for your platform.</p></div><Link href={reportLink()} className="secondary-btn"><AdminIcon name="reports" />Open reports</Link></header>
    <div className="overview-toolbar"><div className="overview-periods" aria-label="Dashboard period">{[7, 30, 90].map(days => <Link key={days} href={`/saas-admin/overview?period=${days}`} aria-current={period === days ? "page" : undefined}>Last {days} days</Link>)}</div><span>{display(from, "date")} – {display(today, "date")} · Sri Lanka time</span></div>
    {!data || !model ? <section className="admin-panel overview-error" role="alert"><h2>Dashboard unavailable</h2><p>We couldn’t load the platform data. Please reload the dashboard to try again.</p><a className="secondary-btn" href={`/saas-admin/overview?period=${period}`}>Reload dashboard</a></section> : <>
      <section aria-labelledby="overview-snapshot"><div className="overview-section-heading"><h2 id="overview-snapshot">Platform at a glance</h2><span>Current account and campaign status</span></div><div className="overview-stats">
        <Stat label="Customer workspaces" value={model.workspaces.length} detail={`${data.report.workspaces.filter(w => w.status === "active").length} active · ${data.memberships} memberships`} icon="team" href="/saas-admin/accounts" />
        <Stat label="Active campaigns" value={data.report.campaigns.filter(c => c.status === "active").length} detail={`${data.report.campaigns.length} total campaigns · ${data.campaignGames} configured games`} icon="campaign" href={reportLink("campaigns")} />
        <Stat label="Active subscriptions" value={activeSubscriptions.length} detail={`${expiring.length} expire within the next 30 days`} icon="subscription" href={reportLink("plans")} />
        <Stat label="Pending requests" value={data.pendingRequests} detail="All upgrade and renewal requests awaiting review" icon="bell" href="/saas-admin/subscriptions" />
      </div></section>
      <section aria-labelledby="overview-period-activity"><div className="overview-section-heading"><h2 id="overview-period-activity">Activity in this period</h2><span>Compared with {display(data.report.previous_from, "date")} – {display(data.report.previous_to, "date")}</span></div><div className="overview-stats">
        <Stat label="Game sessions" value={model.current.sessions} detail={`${comparison(model.current.sessions, model.previous.sessions)} vs previous period`} icon="game" href={reportLink()} />
        <Stat label="Unique players" value={model.current.players} detail={`${comparison(model.current.players, model.previous.players)} vs previous period`} icon="team" href={reportLink("workspaces")} />
        <Stat label="Completion rate" value={model.current.completion.toFixed(1) + "%"} detail={`${comparison(model.current.completion, model.previous.completion, true)} vs previous period`} icon="reports" href={reportLink()} />
        <Stat label="Coupons issued" value={model.current.issued} detail={`${model.current.winners} winners · ${model.current.redeemed} coupons redeemed`} icon="coupon" href={reportLink("rewards")} />
      </div></section>
      <div className="overview-chart-grid"><section className="admin-panel"><div className="overview-panel-heading"><div><h2>Daily game sessions</h2><p>All days included, including days without activity.</p></div><Link href={reportLink()}>Details →</Link></div><SessionsChart rows={model.daily} /><p className="overview-note">{model.current.sessions} sessions in this period · {model.previous.sessions} in the previous period</p></section>
        <section className="admin-panel"><div className="overview-panel-heading"><div><h2>Game performance</h2><p>Share of sessions in the selected period</p></div></div>{games.length ? games.map(g => <Link key={String(g.id)} href={reportLink("campaigns", { game: String(g.id) })} className="overview-game"><div><b>{String(g.name)}</b><strong>{display(g.sessions)}</strong></div><progress aria-label={`${g.name}: ${g.sessions} sessions`} value={Number(g.sessions)} max={Math.max(1, model.current.sessions)} /><small>{Number(g.completion).toFixed(1)}% completed · {display(g.players)} unique players</small></Link>) : <p className="overview-empty">No game sessions in this period.</p>}</section></div>
      <div className="overview-two-columns"><section className="admin-panel"><div className="overview-panel-heading"><div><h2>Needs attention</h2><p>Current platform state, across all dates</p></div><AdminIcon name="bell" /></div>
        <Attention label="Subscription requests" count={data.pendingRequests} detail="Waiting for your review" href="/saas-admin/subscriptions" icon="subscription" />
        <Attention label="Upcoming expiries" count={expiring.length} detail="Active subscriptions ending within 30 days" href={reportLink("plans")} icon="campaign" />
        <Attention label="Ended subscription periods" count={ended.length} detail="Review renewal or effective plan limits" href={reportLink("plans")} icon="plans" />
        <Attention label="Workspaces near limits" count={nearLimit.length} detail="At least 90% of a current plan limit used" href={reportLink("workspaces")} icon="usage" />
      </section><section className="admin-panel"><div className="overview-panel-heading"><div><h2>Workspace health</h2><p>Current status and activity in this period</p></div></div><div className="overview-health"><span>Active accounts</span><b>{data.report.workspaces.filter(w => w.status === "active").length}</b></div><div className="overview-health"><span>Suspended accounts</span><b>{data.report.workspaces.filter(w => w.status === "suspended").length}</b></div><div className="overview-health"><span>Disabled accounts</span><b>{data.report.workspaces.filter(w => w.status === "disabled").length}</b></div><div className="overview-health"><span>Workspaces with sessions</span><b>{model.workspaces.filter(w => Number(w.sessions) > 0).length}</b></div><div className="overview-health"><span>Workspaces without sessions</span><b>{model.workspaces.filter(w => !Number(w.sessions)).length}</b></div><div className="overview-health"><span>Grandfathered subscriptions</span><b>{data.report.workspaces.filter(w => w.subscription_status === "grandfathered").length}</b></div></section></div>
      <div className="overview-two-columns"><section className="admin-panel"><div className="overview-panel-heading"><div><h2>Most active workspaces</h2><p>Top five by sessions in the selected period</p></div><Link href={reportLink("workspaces")}>View all →</Link></div><div className="overview-table-scroll" role="region" aria-label="Most active workspaces table" tabIndex={0}><table><thead><tr><th scope="col">Workspace</th><th scope="col">Sessions</th><th scope="col">Players</th><th scope="col">Completion</th></tr></thead><tbody>{topWorkspaces.map(w => <tr key={String(w.id)}><td><Link href={reportLink("campaigns", { workspace: String(w.id) })}>{String(w.name)}</Link><small>{String(w.plan_name)}</small></td><td>{display(w.sessions)}</td><td>{display(w.players)}</td><td>{Number(w.completion).toFixed(1)}%</td></tr>)}{!topWorkspaces.length && <tr><td colSpan={4} className="overview-empty">No workspace activity in this period.</td></tr>}</tbody></table></div></section>
        <section className="admin-panel"><div className="overview-panel-heading"><div><h2>New customer accounts</h2><p>{data.newAccountCount} created in this period · latest five shown</p></div><Link href="/saas-admin/accounts">Manage →</Link></div>{data.newAccounts.length ? <ul className="overview-new-accounts">{data.newAccounts.map(w => <li key={w.id}><Link href={reportLink("workspaces", { workspace: w.id })}><span><b>{w.name}</b><small>{display(w.created_at, "date")}</small></span><span className="overview-account-status">{w.status}</span></Link></li>)}</ul> : <p className="overview-empty">No new accounts in this period.</p>}</section></div>
      <section aria-labelledby="overview-shortcuts"><div className="overview-section-heading"><h2 id="overview-shortcuts">Quick access</h2></div><div className="overview-shortcuts">{quickLinks.map(q => <Link className="admin-panel" key={q.href} href={q.href}><AdminIcon name={q.icon} size={22} /><span><b>{q.label}</b><small>{q.detail}</small></span><span aria-hidden="true">→</span></Link>)}</div></section>
      <footer className="overview-footer"><p>Updated {new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit" }).format(new Date(data.report.generated_at))} · Sri Lanka time. Today is a partial day.</p><p>Activity follows sessions started in the selected dates. Players are deduplicated within each workspace; session and coupon statuses are current. Active subscriptions exclude grandfathered accounts. Plan limits use current whole-workspace usage.</p></footer>
    </>}
  </div>;
}
