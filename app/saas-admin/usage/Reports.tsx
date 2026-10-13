"use client";

import { useId, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AdminIcon, type AdminIconName } from "../../admin/AdminIcon";
import { buildModel, comparison, csvText, display, gameName, reportUrl, shiftDate, validateFilters, type Column, type Filters, type Report, type Row } from "./report-utils";

type Section = { title: string; columns: Column[]; rows: Row[] };
const tabs: {id:string;label:string;icon:AdminIconName}[] = [
  {id:"overview",label:"Overview",icon:"overview"},{id:"workspaces",label:"Workspaces",icon:"team"},
  {id:"campaigns",label:"Campaigns & Games",icon:"game"},{id:"rewards",label:"Rewards",icon:"coupon"},{id:"plans",label:"Plans & Subscriptions",icon:"plans"},
];
const c = (key:string,label:string,format?:Column["format"]):Column => ({key,label,format});
const activityColumns = [c("sessions","Sessions","number"),c("players","Unique players","number"),c("completion","Completion %","percent"),c("winners","Winners","number")];
const workspaceColumns = [c("name","Workspace"),c("plan_name","Plan"),c("status","Account status"),c("activity","Period activity"),...activityColumns,c("last_activity","Last play · all dates","date")];
const campaignColumns = [c("name","Campaign"),c("workspace_name","Workspace"),c("status","Current status"),...activityColumns,c("redeemed","Redeemed","number")];
const gameColumns = [c("name","Game"),...activityColumns,c("issued","Coupons","number"),c("redemption","Redemption %","percent")];
const rewardColumns = [c("name","Campaign"),c("workspace_name","Workspace"),c("winners","Winners","number"),c("issued","Issued","number"),c("redeemed","Redeemed","number"),c("unredeemed","Unredeemed","number"),c("expired","Expired","number"),c("cancelled","Cancelled","number"),c("redemption","Redemption %","percent")];
const dailyColumns = [c("date","Date"),c("sessions","Sessions","number"),c("previous_date","Comparison date"),c("previous_sessions","Previous sessions","number"),c("players","Unique players","number"),c("completed","Completed","number"),c("winners","Winners","number"),c("issued","Coupons issued","number")];
const planColumns = [c("name","Plan"),c("workspaces","Workspaces","number"),c("active","Active subscriptions","number"),c("expiring","Expire in 30 days","number"),c("pending","Pending requests in period","number"),...activityColumns];
const subscriptionColumns = [c("name","Workspace"),c("plan_name","Assigned plan"),c("effective_plan","Effective limits plan"),c("subscription_status","Recorded status"),c("period_end","Period ends","date"),c("renewal","Renewal attention")];
const requestColumns = [c("workspace_name","Workspace"),c("requested_plan","Requested plan"),c("status","Current status"),c("created_at","Requested","date"),c("reviewed_at","Reviewed","date")];
const limitColumns = [c("name","Workspace"),c("effective_plan","Limits plan"),c("active_campaigns","Active campaigns","number"),c("campaign_limit","Campaign limit","number"),c("monthly_players","Players this month","number"),c("monthly_limit","Monthly player limit","number"),c("team_members","Team members","number"),c("team_limit","Team limit","number")];
const summaryColumns = [c("name","Metric"),c("current","Selected period","number"),c("previous","Previous period","number"),c("change","Change")];

function DownloadIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></svg>; }
function download(sections:Section[],metadata:Row,name:string) {
  const url=URL.createObjectURL(new Blob([csvText(sections,metadata)],{type:"text/csv;charset=utf-8;"}));
  const a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function Card({label,value,detail,icon}:{label:string;value:string|number;detail?:string;icon:AdminIconName}) {
  return <article className="report-stat"><div className="report-stat-label"><span>{label}</span><AdminIcon name={icon}/></div><strong>{typeof value==="number"?display(value):value}</strong>{detail&&<small>{detail}</small>}</article>;
}
function DataTable({title,description,rows,columns,metadata,onName,defaultSort="sessions",renderCell,exportColumns}:Section & {
  description?:string;exportColumns?:Column[];metadata:Row;onName?:(row:Row)=>void;defaultSort?:string;
  renderCell?:(row:Row,column:Column)=>ReactNode|undefined;
}) {
  const id=useId();
  const [search,setSearch]=useState(""); const [sort,setSort]=useState({key:columns.some(c=>c.key===defaultSort)?defaultSort:columns[0].key,descending:defaultSort==="sessions"}); const [page,setPage]=useState(0);
  const filtered=useMemo(()=>rows.filter(r=>columns.some(c=>display(r[c.key],c.format).toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>{
    const av=a[sort.key],bv=b[sort.key]; if(av==null) return bv==null?0:1; if(bv==null)return -1;
    const n=typeof av==="number"&&typeof bv==="number"?av-bv:String(av).localeCompare(String(bv),undefined,{numeric:true}); return sort.descending?-n:n;
  }),[rows,columns,search,sort]);
  const pageCount=Math.max(1,Math.ceil(filtered.length/20)), currentPage=Math.min(page,pageCount-1);
  return <section className="admin-panel report-panel" aria-labelledby={id}>
    <div className="report-section-head"><div><h2 id={id}>{title}</h2>{description&&<p>{description}</p>}</div><div className="report-table-actions">
      <input type="search" aria-label={`Search ${title}`} placeholder="Search this table" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/>
      <button type="button" className="secondary-btn" onClick={()=>download([{title,columns:exportColumns??columns,rows:filtered}],{...metadata,"Table search":search},`platform-${title.toLowerCase().replace(/[^a-z0-9]+/g,"-")}.csv`)}><DownloadIcon/>CSV</button>
    </div></div>
    <div className="report-table-scroll" tabIndex={0} role="region" aria-label={`${title} table`}><table>
      <thead><tr>{columns.map(col=><th key={col.key} scope="col" aria-sort={sort.key===col.key?(sort.descending?"descending":"ascending"):"none"}><button type="button" onClick={()=>{setSort({key:col.key,descending:sort.key===col.key?!sort.descending:false});setPage(0);}}>{col.label}<span aria-hidden="true">{sort.key===col.key?(sort.descending?"↓":"↑"):"↕"}</span></button></th>)}</tr></thead>
      <tbody>{filtered.slice(currentPage*20,currentPage*20+20).map((row,index)=><tr key={String(row.id??row.date??row.name??index)}>{columns.map(col=><td key={col.key}>{renderCell?.(row,col)??(col.key==="name"&&onName?<button className="report-link" type="button" onClick={()=>onName(row)}>{display(row[col.key],col.format)} <span aria-hidden="true">↗</span></button>:display(row[col.key],col.format))}</td>)}</tr>)}
      {!filtered.length&&<tr><td colSpan={columns.length}><div className="report-empty">No records match {search?"this search":"these filters"}.</div></td></tr>}</tbody>
    </table></div>
    <div className="report-pagination"><span>{filtered.length?`${currentPage*20+1}–${Math.min(filtered.length,(currentPage+1)*20)} of ${filtered.length}`:"0 records"}</span><div><button className="secondary-btn" type="button" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Previous</button><button className="secondary-btn" type="button" disabled={currentPage+1===pageCount} onClick={()=>setPage(currentPage+1)}>Next</button></div></div>
  </section>;
}
function Trend({rows}:{rows:Row[]}) {
  const max=Math.max(1,...rows.flatMap(r=>[Number(r.sessions),Number(r.previous_sessions)]));
  const x=(i:number)=>42+i/Math.max(1,rows.length-1)*724; const y=(n:number)=>190-n/max*155;
  const path=(key:string)=>rows.map((r,i)=>`${i?"L":"M"}${x(i)},${y(Number(r[key]))}`).join(" ");
  return <div className="report-chart"><svg viewBox="0 0 800 235" role="img" aria-label="Daily sessions, selected period compared with the previous period. Exact values are in the daily activity table.">
    {[0,.5,1].map(r=><g key={r}><line x1="42" x2="766" y1={y(max*r)} y2={y(max*r)} className="report-gridline"/><text x="30" y={y(max*r)+4} textAnchor="end">{Math.round(max*r)}</text></g>)}
    <path d={path("previous_sessions")} className="report-trend-previous"/><path d={path("sessions")} className="report-trend-current"/>
    {rows.map((r,i)=><g key={String(r.date)}><circle cx={x(i)} cy={y(Number(r.sessions))} r={rows.length>60?2:4} className="report-point"><title>{`${r.date}: ${r.sessions} sessions; ${r.previous_date}: ${r.previous_sessions} sessions`}</title></circle>{(i===0||i===rows.length-1||(rows.length>7&&i%Math.ceil(rows.length/6)===0))&&<text x={x(i)} y="218" textAnchor={i===0?"start":i===rows.length-1?"end":"middle"}>{String(r.date).slice(5)}</text>}</g>)}
  </svg><div className="report-legend"><span><i/>Selected period</span><span><i className="previous"/>Previous period · matched by day number</span></div></div>;
}
function Limit({used,limit}:{used:number;limit:number|null}) {
  return <div className="report-limit"><span>{display(used)} / {limit===null?"Unlimited":display(limit)}</span>{limit!==null&&<progress value={Math.min(used,limit)} max={limit} aria-label={`${used} of ${limit} used`}/>}</div>;
}

export default function Reports({report,filters,today,error}:{report:Report|null;filters:Filters;today:string;error:string}) {
  const router=useRouter(); const [pending,startTransition]=useTransition(); const [draft,setDraft]=useState(filters); const [tab,setTab]=useState(filters.view); const [validation,setValidation]=useState("");
  const model=useMemo(()=>report?buildModel(report):null,[report]);
  const options=report?.options??{workspaces:[],plans:[],campaigns:[],games:[]};
  const dirty=(["from","to","workspace","plan","campaign","game"] as const).some(k=>draft[k]!==filters[k]);
  const update=(key:keyof Filters,value:string)=>setDraft(d=>({...d,[key]:value,...(key==="workspace"?{campaign:""}:{})}));
  function navigate(next:Filters) {
    const invalid=validateFilters(next,today);setValidation(invalid);if(invalid)return;setDraft(next);
    startTransition(()=>{const url=reportUrl(next);if(window.location.pathname+window.location.search===url)router.refresh();else router.push(url,{scroll:false});});
  }
  function drill(change:Partial<Filters>) { navigate({...filters,view:tab,...change}); }
  function switchTab(id:string) { setTab(id); window.history.replaceState(null,"",reportUrl({...filters,view:id})); }
  function preset(id:string) {
    if(!id)return;
    const from=id==="today"?today:id==="7"?shiftDate(today,-6):id==="30"?shiftDate(today,-29):today.slice(0,7)+"-01";
    setDraft(d=>({...d,from,to:today}));
  }
  const metadata:Row={"Report":"Platform usage","From":filters.from,"To":filters.to,"Timezone":"Asia/Colombo",
    "Workspace":options.workspaces.find(w=>w.id===filters.workspace)?.name ?? (filters.workspace || "All"),
    "Plan":options.plans.find(p=>p.id===filters.plan)?.name ?? (filters.plan || "All"),
    "Campaign":options.campaigns.find(c=>c.id===filters.campaign)?.name ?? (filters.campaign || "All"),
    "Game":filters.game?gameName(filters.game):"All","Generated at":report?.generated_at??"",
    "Previous from":report?.previous_from??"","Previous to":report?.previous_to??"",
    "Activity basis":"Sessions started in the selected dates; unique players deduplicated within each workspace",
    "Rewards basis":"Rewards from those sessions; coupon and session status as of report generation",
    "Snapshot basis":"Account/subscription status and limits are current. Monthly limits cover the whole workspace this calendar month.",
    "Subscription requests":"Created in the selected period, for the matching workspaces. Plan filter uses assigned plan.",
    "Unlimited limits":"Blank numeric limits mean unlimited"};
  const sections:Record<string,Section[]>=model?{
    overview:[{title:"Overview",columns:summaryColumns,rows:model.summary},{title:"Daily activity",columns:dailyColumns,rows:model.daily},{title:"Game performance",columns:gameColumns,rows:model.games}],
    workspaces:[{title:"Workspace activity",columns:workspaceColumns,rows:model.workspaces},{title:"Current plan limits",columns:limitColumns,rows:model.workspaces}],
    campaigns:[{title:"Campaign performance",columns:campaignColumns,rows:model.campaigns},{title:"Game performance",columns:gameColumns,rows:model.games}],
    rewards:[{title:"Rewards by campaign",columns:rewardColumns,rows:model.campaigns}],
    plans:[{title:"Usage by assigned plan",columns:planColumns,rows:model.plans},{title:"Subscriptions",columns:subscriptionColumns,rows:model.subscriptions},{title:"Subscription requests",columns:requestColumns,rows:model.requests}],
  }:{};
  return <div className="platform-reports" aria-busy={pending}>
    <header className="admin-header"><div><div className="eyebrow">PLATFORM INTELLIGENCE</div><h1>Usage &amp; Reports</h1><p>Understand activity, campaign performance and account health.</p></div><button type="button" className="secondary-btn" disabled={!model||pending} onClick={()=>download(sections[tab],metadata,`platform-${tab}-${filters.from}-to-${filters.to}.csv`)}><DownloadIcon/>Export report</button></header>
    <form className="admin-panel report-filter-panel" onSubmit={e=>{e.preventDefault();navigate({...draft,view:tab});}}>
      <div className="report-filter-head"><strong><AdminIcon name="reports"/>Report filters</strong><label>Quick dates<select aria-label="Quick dates" defaultValue="" onChange={e=>{preset(e.target.value);e.target.value="";}}><option value="">Custom range</option><option value="today">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="month">This month</option></select></label></div>
      <div className="report-filters"><label>From<input type="date" name="from" required max={today} value={draft.from} onChange={e=>update("from",e.target.value)}/></label>
        <label>To<input type="date" name="to" required max={today} value={draft.to} onChange={e=>update("to",e.target.value)}/></label>
        <label>Workspace<select name="workspace" value={draft.workspace} onChange={e=>update("workspace",e.target.value)}><option value="">All workspaces</option>{options.workspaces.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
        <label>Assigned plan<select name="plan" value={draft.plan} onChange={e=>update("plan",e.target.value)}><option value="">All plans</option>{options.plans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Campaign<select name="campaign" value={draft.campaign} onChange={e=>update("campaign",e.target.value)}><option value="">All campaigns</option>{options.campaigns.filter(c=>!draft.workspace||c.workspace_id===draft.workspace).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Game type<select name="game" value={draft.game} onChange={e=>update("game",e.target.value)}><option value="">All games</option>{options.games.map(g=><option key={g} value={g}>{gameName(g)}</option>)}</select></label>
      </div><div className="report-filter-footer"><span>Dates include both days · Sri Lanka time · maximum 366 days</span><div><button type="button" className="secondary-btn" disabled={pending} onClick={()=>navigate({from:shiftDate(today,-29),to:today,workspace:"",campaign:"",game:"",plan:"",view:tab})}>Reset</button><button type="submit" className="primary-btn" disabled={pending}>{pending?"Loading report…":"Apply filters"}</button></div></div>
      {(validation||error)&&<p className="error-box" role="alert">{validation||error}</p>}
      <p className="report-filter-status" role="status">{pending?"Updating all report sections…":dirty?"You have unapplied changes. Apply filters to update the report and exports.":report?`Applied: ${display(report.from,"date")} – ${display(report.to,"date")}`:"Select filters to load a report."}</p>
    </form>
    <div className="report-tabs" role="tablist" aria-label="Report sections">{tabs.map((t,i)=><button key={t.id} id={`report-tab-${t.id}`} type="button" role="tab" aria-selected={tab===t.id} aria-controls="report-content" tabIndex={tab===t.id?0:-1} disabled={pending} onClick={()=>switchTab(t.id)} onKeyDown={e=>{const next=e.key==="ArrowRight"?(i+1)%tabs.length:e.key==="ArrowLeft"?(i+tabs.length-1)%tabs.length:e.key==="Home"?0:e.key==="End"?tabs.length-1:-1;if(next>=0){e.preventDefault();switchTab(tabs[next].id);document.getElementById(`report-tab-${tabs[next].id}`)?.focus();}}}><AdminIcon name={t.icon}/>{t.label}</button>)}</div>
    {model&&report&&<div id="report-content" role="tabpanel" aria-labelledby={`report-tab-${tab}`} className={pending?"report-loading":""}>
      <div className="report-context"><span>Compared with {display(report.previous_from,"date")} – {display(report.previous_to,"date")}</span><span>As of {new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Colombo",hour:"2-digit",minute:"2-digit"}).format(new Date(report.generated_at))} · Sri Lanka</span></div>
      {!report.workspaces.length&&<div className="report-notice">No workspaces match this combination of filters. Try removing a campaign, game or plan filter.</div>}
      {tab==="overview"&&<>
        <div className="report-stats">{model.summary.map((r,i)=><Card key={String(r.name)} label={String(r.name).replace(" (%)","")} value={i===2||i===5?Number(r.current).toFixed(1)+"%":Number(r.current)} detail={`${r.change} vs previous period`} icon={(["game","team","reports","winner","coupon","reports"] as AdminIconName[])[i]}/>)}</div>
        <section className="admin-panel report-panel"><div className="report-section-head"><div><h2>Daily game sessions</h2><p>The full selected date range, with zero-activity days included.</p></div></div><Trend rows={model.daily}/></section>
        <div className="report-two-columns"><section className="admin-panel report-panel"><h2>Session outcomes</h2><p className="report-muted">Current outcome of sessions started in the selected period.</p>{[["Completed",model.current.completed],["In progress",model.current.in_progress],["Failed",model.current.failed],["Expired",model.current.session_expired]].map(([label,value])=><div className="report-breakdown" key={label}><span>{label}</span><strong>{display(value)}</strong></div>)}</section>
          <section className="admin-panel report-panel"><h2>Workspace activity</h2><p className="report-muted">Within the selected period and filters.</p><div className="report-breakdown"><span>With game sessions</span><strong>{model.workspaces.filter(w=>Number(w.sessions)>0).length}</strong></div><div className="report-breakdown"><span>No game sessions</span><strong>{model.workspaces.filter(w=>!Number(w.sessions)).length}</strong></div><div className="report-breakdown"><span>Currently active campaigns</span><strong>{report.workspaces.reduce((n,w)=>n+w.scoped_active_campaigns,0)}</strong></div><button type="button" className="report-link" onClick={()=>switchTab("workspaces")}>Explore workspaces →</button></section></div>
        <details className="report-details"><summary>View daily activity table</summary><DataTable title="Daily activity" rows={model.daily} columns={dailyColumns} metadata={metadata} defaultSort="date"/></details>
        <DataTable title="Game performance" rows={model.games} columns={gameColumns} metadata={metadata} onName={r=>drill({game:String(r.id),view:"campaigns"})}/>
      </>}
      {tab==="workspaces"&&<>
        <DataTable title="Workspace activity" description="Click a workspace for its campaign breakdown. Last play follows the campaign/game filters across all dates; account status is current." rows={model.workspaces} columns={workspaceColumns} metadata={metadata} onName={r=>drill({workspace:String(r.id),view:"campaigns"})}/>
        <DataTable exportColumns={limitColumns} title="Current plan limits" description="Whole-workspace usage, independent of the report date/campaign/game filters. Players use the current calendar month. Expired subscriptions use the effective fallback plan." rows={model.workspaces} columns={[c("name","Workspace"),c("effective_plan","Limits plan"),c("active_campaigns","Campaign usage"),c("monthly_players","Monthly player usage"),c("team_members","Team usage")]} metadata={metadata} defaultSort="name" renderCell={(r,col)=>col.key==="active_campaigns"?<Limit used={Number(r.active_campaigns)} limit={r.campaign_limit===null?null:Number(r.campaign_limit)}/>:col.key==="monthly_players"?<Limit used={Number(r.monthly_players)} limit={r.monthly_limit===null?null:Number(r.monthly_limit)}/>:col.key==="team_members"?<Limit used={Number(r.team_members)} limit={r.team_limit===null?null:Number(r.team_limit)}/>:undefined}/>
      </>}
      {tab==="campaigns"&&<><DataTable title="Campaign performance" description="Click a campaign to focus the report on that campaign. Current campaign status is shown alongside period activity." rows={model.campaigns} columns={campaignColumns} metadata={metadata} onName={r=>drill({campaign:String(r.id),workspace:String(r.workspace_id),view:"overview"})}/><DataTable title="Game performance" description="Unique players are deduplicated within each game type and workspace; totals across games may overlap." rows={model.games} columns={gameColumns} metadata={metadata} onName={r=>drill({game:String(r.id),view:"overview"})}/></>}
      {tab==="rewards"&&<>
        <div className="report-notice">These are rewards from sessions started in the selected period. Coupon status is current as of this report, including coupons that expired naturally. Redemption rate = redeemed ÷ issued; this is not a count of redemptions performed during the period.</div>
        <div className="report-stats">{[["Issued",model.current.issued],["Redeemed",model.current.redeemed],["Unredeemed",model.current.unredeemed],["Expired",model.current.expired],["Cancelled",model.current.cancelled]].map(([label,value])=><Card key={label} label={String(label)} value={Number(value)} icon="coupon"/>)}<Card label="Redemption rate" value={model.current.redemption.toFixed(1)+"%"} detail={comparison(model.current.redemption,model.previous.redemption,true)+" vs previous cohort"} icon="reports"/></div>
        <DataTable title="Rewards by campaign" rows={model.campaigns} columns={rewardColumns} metadata={metadata} onName={r=>drill({campaign:String(r.id),workspace:String(r.workspace_id)})}/>
      </>}
      {tab==="plans"&&<>
        <div className="report-notice">Subscriptions reflect the current state of matching workspaces. Requests use their creation dates within the selected period. Plan filters use the assigned plan; effective limits may fall back to Free after expiry.</div>
        <DataTable title="Usage by assigned plan" rows={model.plans} columns={planColumns} metadata={metadata} onName={r=>drill({plan:String(r.id),view:"workspaces"})}/>
        <DataTable title="Subscriptions" description="Upcoming expiries cover the next 30 days from report generation." rows={model.subscriptions} columns={subscriptionColumns} metadata={metadata} defaultSort="period_end"/>
        <DataTable title="Subscription requests" description="Upgrade and renewal requests created during the selected period." rows={model.requests} columns={requestColumns} metadata={metadata} defaultSort="created_at"/>
      </>}
      <details className="report-definitions"><summary>How to read these reports</summary><ul><li>Dates are inclusive and use Asia/Colombo. Comparisons use the immediately preceding period of the same length. Today is a partial day.</li><li>All activity measures are based on sessions started in the selected range. Completion uses their current status.</li><li>Unique players are counted by mobile number within each workspace, deduplicated across campaigns. The platform total adds these workspace counts. Daily and campaign player counts may overlap.</li><li>Reward counts follow the same session cohort. Winners can exist without a coupon. Coupon and subscription states are current, not historical snapshots.</li><li>Limits show whole-workspace current usage; monthly players match the calendar-month limit calculation. Blank numeric limits in exports mean unlimited.</li><li>Exports use applied filters. A table CSV includes its search and sort across all pages; Export report includes every table in the selected report section.</li></ul></details>
    </div>}
  </div>;
}
