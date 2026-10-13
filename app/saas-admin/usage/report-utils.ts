export type Filters = { from: string; to: string; workspace: string; plan: string; campaign: string; game: string; view: string };
export const views = ["overview", "workspaces", "campaigns", "rewards", "plans"] as const;
export type Metric = { sessions: number; players: number; completed: number; failed: number; session_expired: number; in_progress: number; winners: number; issued: number; redeemed: number; unredeemed: number; expired: number; cancelled: number };
export type Workspace = {
  id: string; name: string; status: string; plan_slug: string; plan_name: string; subscription_status: string;
  period_end: string | null; effective_plan: string | null; last_activity: string | null;
  monthly_players: number; monthly_limit: number | null; active_campaigns: number; campaign_limit: number | null;
  team_members: number; team_limit: number | null; scoped_campaigns: number; scoped_active_campaigns: number;
};
export type Report = {
  generated_at: string; from: string; to: string; previous_from: string; previous_to: string;
  metrics: (Metric & { kind: string; key: string; period: string })[];
  workspaces: Workspace[];
  campaigns: { id: string; name: string; workspace_id: string; workspace_name: string; status: string; plan_slug: string }[];
  requests: { id: string; workspace_id: string; workspace_name: string; requested_plan: string; status: string; created_at: string; reviewed_at: string | null }[];
  options: { workspaces: { id: string; name: string }[]; plans: { id: string; name: string }[]; campaigns: { id: string; name: string; workspace_id: string }[]; games: string[] };
};
export type Row = Record<string, string | number | null>;
export type Column = { key: string; label: string; format?: "number" | "percent" | "date" };
export const emptyMetric: Metric = { sessions: 0, players: 0, completed: 0, failed: 0, session_expired: 0, in_progress: 0, winners: 0, issued: 0, redeemed: 0, unredeemed: 0, expired: 0, cancelled: 0 };
export function localDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return ["year", "month", "day"].map(key => parts.find(p => p.type === key)?.value).join("-");
}
export function shiftDate(date: string, days: number) {
  const d = new Date(date + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10);
}
export function validDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(date + "T00:00:00Z"); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}
export function validateFilters(f: Filters, today: string) {
  if (!validDate(f.from) || !validDate(f.to) || f.from > f.to || f.to > today) return "Choose valid dates, with From on or before To and no future dates.";
  if ((Date.parse(f.to) - Date.parse(f.from)) / 86400000 > 365) return "Choose a date range of up to 366 days.";
  if ([f.workspace, f.campaign].some(id => id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) return "The workspace or campaign filter is invalid. Reset the filters and try again.";
  if (f.plan.length > 40 || f.game.length > 40) return "The plan or game filter is invalid.";
  return "";
}
export function reportUrl(f: Filters) {
  const p = new URLSearchParams(); Object.entries(f).forEach(([k,v]) => { if (v) p.set(k,v); }); return "/saas-admin/usage?" + p.toString();
}
export function gameName(type: string) {
  const names: Record<string,string> = { spin: "Spin & Win", scratch: "Scratch & Win", "pick-card": "Pick a Card", slot: "Slot", quiz: "Quiz", "lucky-draw": "Lucky Draw" }; return names[type] ?? type;
}
export function percent(n: number, total: number) { return total ? n / total * 100 : 0; }
export function comparison(current: number, previous: number, rate = false) {
  if (rate) { const diff=current-previous; return `${diff > 0 ? "+" : ""}${diff.toFixed(1)} pp`; }
  if (!previous) return current ? "New activity" : "No change";
  const change=(current-previous)/previous*100; return `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
}
export function display(value: Row[string], format?: Column["format"]) {
  if (value === null || value === undefined || value === "") return "—";
  if (format === "percent") return Number(value).toFixed(1) + "%";
  if (format === "number" || typeof value === "number") return new Intl.NumberFormat("en-LK").format(Number(value));
  if (format === "date") return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Colombo", day: "2-digit", month: "short", year: "numeric" }).format(new Date(String(value)));
  return String(value);
}
export function csvCell(value: Row[string]) {
  const raw = value == null ? "" : String(value);
  const safe = typeof value === "string" && /^[\s\u0000-\u001f]*[=+\-@]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}
export function csvText(sections: { title: string; columns: Column[]; rows: Row[] }[], metadata: Row) {
  const lines = Object.entries(metadata).map(([key,value]) => [key,value].map(csvCell).join(","));
  for (const section of sections) { lines.push("", csvCell(section.title), section.columns.map(c=>csvCell(c.label)).join(","));
    for (const row of section.rows) lines.push(section.columns.map(c=>csvCell(row[c.key])).join(",")); }
  return "\uFEFF" + lines.join("\r\n");
}
export function buildModel(report: Report) {
  const index = new Map(report.metrics.map(m=>[`${m.kind}:${m.key}:${m.period}`,m]));
  const get = (kind: string, key = "*", period = "current"): Metric => index.get(`${kind}:${key}:${period}`) ?? emptyMetric;
  const measures = (m: Metric) => ({ ...m, completion: percent(m.completed,m.sessions), redemption: percent(m.redeemed,m.issued) });
  const current=measures(get("total")), previous=measures(get("total","*","previous"));
  const workspaces: Row[] = report.workspaces.map(w=>({ ...w, ...measures(get("workspace",w.id)), activity: get("workspace",w.id).sessions ? "Played in period" : "No play in period" }));
  const campaigns: Row[] = report.campaigns.map(c=>({ ...c,...measures(get("campaign",c.id)) }));
  const types = report.options.games.filter(type=>report.metrics.some(m=>m.kind==="game" && m.key===type));
  const games: Row[] = types.map(type=>({id:type,name:gameName(type),...measures(get("game",type))}));
  const daily: Row[] = [];
  for(let date=report.from,offset=0; date<=report.to; date=shiftDate(date,1),offset++) {
    const previousDate=shiftDate(report.previous_from,offset);
    daily.push({date,previous_date:previousDate,...measures(get("day",date)),previous_sessions:get("day",previousDate,"previous").sessions});
  }
  const now=Date.parse(report.generated_at), soon=now+30*86400000;
  const subscriptions: Row[] = report.workspaces.map(w=>{
    const end = w.period_end ? Date.parse(w.period_end) : null;
    const renewal = end !== null && end <= now ? "Period ended" : end !== null && end <= soon && w.subscription_status === "active" ? "Expires within 30 days" : "—";
    return {...w,renewal};
  });
  const plans: Row[] = [...new Set(report.workspaces.map(w=>w.plan_slug))].map(id=>{
    const accounts = subscriptions.filter(w=>w.plan_slug===id);
    return {id,name:accounts[0].plan_name,workspaces:accounts.length,
      active:accounts.filter(w=>w.subscription_status==="active" && (!w.period_end || Date.parse(String(w.period_end))>now)).length,
      expiring:accounts.filter(w=>w.renewal==="Expires within 30 days").length,
      pending:report.requests.filter(r=>r.status==="pending" && accounts.some(w=>w.id===r.workspace_id)).length,
      ...measures(get("plan",id))};
  });
  const requests: Row[] = report.requests.map(r=>({...r}));
  const summary: Row[] = ([['Sessions','sessions'],['Unique players','players'],['Completion rate (%)','completion'],['Winners','winners'],['Coupons issued','issued'],['Redemption rate (%)','redemption']] as const).map(([name,key])=>({name,current:current[key],previous:previous[key],change:comparison(current[key],previous[key],key==='completion'||key==='redemption')}));
  return {current,previous,workspaces,campaigns,games,daily,subscriptions,plans,requests,summary};
}
