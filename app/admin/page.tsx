import Link from "next/link";
import { requireAdmin } from "../../lib/admin-auth";
import { createSupabaseServerClient } from "../../lib/supabase-server";
import LiveCampaignOverview,{type LiveCampaignRow}from"./LiveCampaignOverview";
import DashboardAlerts,{type DashboardAlert}from"./DashboardAlerts";
import RecentActivity,{type RecentActivityRow}from"./RecentActivity";
import DashboardQuickActions from"./DashboardQuickActions";

type DashboardStats={total_games:number;active_campaigns:number;total_participants:number;total_spins:number;total_winners:number;active_coupons:number;redeemed_coupons:number;prizes_distributed:number};
type Campaign={id:string;name:string;status:string;scheduling_mode:string;starts_at:string|null;ends_at:string|null;created_at:string};
type ReportingRow={session_id:string;played_at:string;mobile:string;customer_name:string|null;campaign_name:string;game_name:string;result_type:string;prize_name:string|null};
type CampaignGame={id:string;game_id:string;campaign_id:string;status:string;appearance:unknown;rules:unknown;games:{name:string}|{name:string}[]|null;campaigns:{status:string}|{status:string}[]|null};
type Prize={inventory:number|null;active:boolean;campaign_games:{campaign_id:string}|{campaign_id:string}[]|null};
type SearchParams={range?:string;campaign?:string;from?:string;to?:string};

function label(s:string){return s.replace(/[_-]/g," ").replace(/\b\w/g,l=>l.toUpperCase())}
function date(v:string|null){if(!v)return"—";return new Date(v).toLocaleString("en-LK",{timeZone:"Asia/Colombo",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",hour12:true})}
function obj(v:unknown){return Boolean(v&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v as Record<string,unknown>).length)}
function validDate(v:string|undefined){return Boolean(v&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(new Date(`${v}T00:00:00+05:30`).getTime()))}
function shortDate(v:string){return new Date(`${v}T00:00:00+05:30`).toLocaleDateString("en-LK",{timeZone:"Asia/Colombo",year:"numeric",month:"short",day:"numeric"})}
function Icon({type}:{type:string}){const p={width:22,height:22,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2};if(type==="campaign")return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 11h18"/></svg>;if(type==="game")return <svg {...p}><path d="M6 12h4M8 10v4M15 13h.01M18 11h.01"/><path d="M7 6h10a5 5 0 0 1 4.7 6.7l-1.3 3.7a2.5 2.5 0 0 1-4.1 1l-1.7-1.5H9.4l-1.7 1.5a2.5 2.5 0 0 1-4.1-1l-1.3-3.7A5 5 0 0 1 7 6Z"/></svg>;if(type==="users")return <svg {...p}><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2M16 3a4 4 0 0 1 0 8"/></svg>;if(type==="play")return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4Z"/></svg>;if(type==="winner")return <svg {...p}><path d="M7 4h10v4a5 5 0 0 1-10 0ZM8 21h8M12 13v8"/></svg>;if(type==="rate")return <svg {...p}><path d="m19 5-14 14M6.5 5a1.5 1.5 0 1 0 0 3M17.5 16a1.5 1.5 0 1 0 0 3"/></svg>;return <svg {...p}><path d="M2 7h20v5H2zM4 12v9h16v-9M12 7v14"/></svg>}

export default async function AdminDashboard({searchParams}:{searchParams:Promise<SearchParams>}){
 const{user,role,workspaceId}=await requireAdmin();
 const params=await searchParams;
 const range=["today","7d","30d","all","custom"].includes(params.range??"")?params.range!:"30d";
 const campaignId=params.campaign??"all";
 const customFrom=validDate(params.from)?params.from!:"";
 const customTo=validDate(params.to)?params.to!:"";
 const customValid=range==="custom"&&Boolean(customFrom&&customTo&&customFrom<=customTo);
 const supabase=await createSupabaseServerClient();
 const campaignsQuery=supabase.from("campaigns").select("id,name,status,scheduling_mode,starts_at,ends_at,created_at").eq("workspace_id",workspaceId).order("created_at",{ascending:false});
 if(role!=="viewer")campaignsQuery.eq("created_by",user.id);
 const gamesQuery=supabase.from("campaign_games").select("id,game_id,campaign_id,status,appearance,rules,games(name),campaigns!inner(status,workspace_id,created_by)").eq("campaigns.workspace_id",workspaceId);
 if(role!=="viewer")gamesQuery.eq("campaigns.created_by",user.id);
 const prizesQuery=supabase.from("prizes").select("inventory,active,campaign_games!inner(campaign_id,campaigns!inner(workspace_id,created_by))").eq("campaign_games.campaigns.workspace_id",workspaceId).eq("active",true);
 if(role!=="viewer")prizesQuery.eq("campaign_games.campaigns.created_by",user.id);
 const[statsR,campaignsR,reportingR,gamesR,prizesR]=await Promise.all([
  supabase.rpc("get_dashboard_stats"),
  campaignsQuery,
  supabase.rpc("get_game_reporting"),
  gamesQuery,
  prizesQuery
 ]);
 const stats:DashboardStats=statsR.data?.[0]??{total_games:0,active_campaigns:0,total_participants:0,total_spins:0,total_winners:0,active_coupons:0,redeemed_coupons:0,prizes_distributed:0};
 const campaigns=(campaignsR.data??[])as Campaign[];
 const reporting=(reportingR.data??[])as ReportingRow[];
 const campaignGames=(gamesR.data??[])as unknown as CampaignGame[];
 const prizes=(prizesR.data??[])as unknown as Prize[];
 const hasError=statsR.error||campaignsR.error||reportingR.error||gamesR.error||prizesR.error;
 const selectedCampaign=campaignId==="all"?null:campaigns.find(c=>c.id===campaignId)??null;
 const now=new Date();
 let from:Date|null=null,to:Date|null=null;
 if(range==="today"){from=new Date(now);from.setHours(0,0,0,0);to=now}
 if(range==="7d")from=new Date(now.getTime()-7*86400000);
 if(range==="30d")from=new Date(now.getTime()-30*86400000);
 if(customValid){from=new Date(`${customFrom}T00:00:00+05:30`);to=new Date(`${customTo}T23:59:59.999+05:30`)}
 const ownCampaignNames=new Set(campaigns.map(c=>c.name));
 const filteredReporting=reporting.filter(r=>{const played=new Date(r.played_at);return ownCampaignNames.has(r.campaign_name)&&(!from||played>=from)&&(!to||played<=to)&&(!selectedCampaign||r.campaign_name===selectedCampaign.name)});
 const scopedCampaigns=selectedCampaign?[selectedCampaign]:campaigns;
 const scopedIds=new Set(scopedCampaigns.map(c=>c.id));
 const scopedGames=campaignGames.filter(g=>scopedIds.has(g.campaign_id));
 const scopedPrizes=prizes.filter(p=>{const cg=Array.isArray(p.campaign_games)?p.campaign_games[0]:p.campaign_games;return Boolean(cg&&scopedIds.has(cg.campaign_id))});
 const totalPlays=filteredReporting.length;
 const totalWinners=filteredReporting.filter(r=>r.result_type==="win").length;
 const participants=new Set(filteredReporting.map(r=>r.mobile).filter(Boolean)).size;
 const winRate=totalPlays?totalWinners/totalPlays*100:0;
 const gameStates=new Map<string,"assigned"|"live">();
 scopedGames.forEach(g=>{const c=Array.isArray(g.campaigns)?g.campaigns[0]:g.campaigns;if(c?.status==="active")gameStates.set(g.game_id,"live");else if(!gameStates.has(g.game_id))gameStates.set(g.game_id,"assigned")});
 const liveGames=[...gameStates.values()].filter(x=>x==="live").length,assignedGames=gameStates.size-liveGames;
 const finite=scopedPrizes.filter(p=>p.inventory!==null),remaining=finite.reduce((s,p)=>s+Number(p.inventory??0),0),unlimited=scopedPrizes.length-finite.length;
 const statusCounts=scopedCampaigns.reduce<Record<string,number>>((a,c)=>{a[c.status]=(a[c.status]||0)+1;return a},{});
 const perfMap=new Map<string,{participants:Set<string>;plays:number;winners:number}>();
 filteredReporting.forEach(r=>{const x=perfMap.get(r.campaign_name)??{participants:new Set<string>(),plays:0,winners:0};if(r.mobile)x.participants.add(r.mobile);x.plays++;if(r.result_type==="win")x.winners++;perfMap.set(r.campaign_name,x)});
 const performance=scopedCampaigns.map(c=>{const r=perfMap.get(c.name);const plays=r?.plays??0,winners=r?.winners??0;return{...c,participants:r?.participants.size??0,spins:plays,winners,winRate:plays?winners/plays*100:0}}).sort((a,b)=>b.spins-a.spins).slice(0,5);
 const liveRows:LiveCampaignRow[]=scopedCampaigns.filter(c=>c.status==="active").map(c=>{const gs=scopedGames.filter(g=>g.campaign_id===c.id),ps=scopedPrizes.filter(p=>{const cg=Array.isArray(p.campaign_games)?p.campaign_games[0]:p.campaign_games;return cg?.campaign_id===c.id}),r=perfMap.get(c.name);return{id:c.id,name:c.name,gameNames:gs.map(g=>{const x=Array.isArray(g.games)?g.games[0]:g.games;return x?.name??"Unnamed game"}),participants:r?.participants.size??0,plays:r?.plays??0,winners:r?.winners??0,remainingPrizes:ps.filter(p=>p.inventory!==null).reduce((s,p)=>s+Number(p.inventory??0),0),unlimitedPrizes:ps.filter(p=>p.inventory===null).length,endsAt:c.ends_at,status:c.status}}).sort((a,b)=>(a.endsAt?new Date(a.endsAt).getTime():Infinity)-(b.endsAt?new Date(b.endsAt).getTime():Infinity));
 const alerts:DashboardAlert[]=[];const nowMs=Date.now(),day=86400000;
 campaigns.forEach(c=>{const gs=campaignGames.filter(g=>g.campaign_id===c.id);const ps=prizes.filter(p=>{const cg=Array.isArray(p.campaign_games)?p.campaign_games[0]:p.campaign_games;return cg?.campaign_id===c.id});if(c.status==="active"){const finiteStock=ps.filter(p=>p.inventory!==null).reduce((s,p)=>s+Number(p.inventory??0),0);const hasUnlimited=ps.some(p=>p.inventory===null);if(ps.length===0)alerts.push({id:`no-prize-${c.id}`,severity:"critical",title:`${c.name}: no active prizes`,detail:"This live campaign has no active prizes available.",href:`/admin/campaigns/${c.id}`,action:"Review"});else if(!hasUnlimited&&finiteStock<=5)alerts.push({id:`low-${c.id}`,severity:finiteStock===0?"critical":"warning",title:`${c.name}: prize stock ${finiteStock===0?"empty":"low"}`,detail:`Only ${finiteStock} active prize unit${finiteStock===1?"":"s"} remaining.`,href:"/admin/prizes",action:"Prizes"});if(c.ends_at){const left=new Date(c.ends_at).getTime()-nowMs;if(left>0&&left<=3*day)alerts.push({id:`ending-${c.id}`,severity:"warning",title:`${c.name}: ending soon`,detail:`Campaign ends ${date(c.ends_at)}.`,href:`/admin/campaigns/${c.id}`,action:"Review"})}const unpublished=gs.filter(g=>g.status!=="published").length;if(unpublished)alerts.push({id:`unpublished-${c.id}`,severity:"warning",title:`${c.name}: ${unpublished} game${unpublished===1?" is":"s are"} not published`,detail:"Assigned games that are not published are unavailable to customers.",href:`/admin/campaigns/${c.id}`,action:"Games"})}if((c.status==="scheduled"||c.status==="draft")&&c.starts_at){const until=new Date(c.starts_at).getTime()-nowMs;if(until>0&&until<=3*day){if(gs.length===0)alerts.push({id:`nogame-${c.id}`,severity:"critical",title:`${c.name}: starts soon with no games`,detail:`Campaign starts ${date(c.starts_at)} but no game is assigned.`,href:`/admin/campaigns/${c.id}`,action:"Configure"});else{const incomplete=gs.filter(g=>g.status!=="published"||(!obj(g.appearance)&&!obj(g.rules))).length;if(incomplete)alerts.push({id:`incomplete-${c.id}`,severity:"warning",title:`${c.name}: configuration incomplete`,detail:`${incomplete} assigned game${incomplete===1?" needs":"s need"} review before the campaign starts ${date(c.starts_at)}.`,href:`/admin/campaigns/${c.id}`,action:"Review"})}}}});
 const priority:Record<DashboardAlert["severity"],number>={critical:0,warning:1,info:2};alerts.sort((a,b)=>priority[a.severity]-priority[b.severity]);
 const recent:RecentActivityRow[]=filteredReporting.slice(0,10).map(r=>({id:r.session_id,playedAt:r.played_at,mobile:r.mobile,customerName:r.customer_name,campaignName:r.campaign_name,gameName:r.game_name,resultType:r.result_type,prizeName:r.prize_name}));
 const rangeLabel=customValid?`${shortDate(customFrom)} – ${shortDate(customTo)}`:range==="custom"?"Custom Range":range==="today"?"Today":range==="7d"?"Last 7 Days":range==="30d"?"Last 30 Days":"All Time";
 const card={background:"#fff",border:"1px solid #e5e7eb",borderRadius:14,padding:18,minHeight:122};
 const cards=[{label:"Active Campaigns",value:scopedCampaigns.filter(c=>c.status==="active").length,sub:selectedCampaign?selectedCampaign.name:`${campaigns.length} total campaigns`,icon:"campaign"},{label:"Assigned / Live Games",value:`${assignedGames} / ${liveGames}`,sub:`${gameStates.size} assigned master games`,icon:"game"},{label:"Total Participants",value:participants.toLocaleString(),sub:rangeLabel,icon:"users"},{label:"Total Plays",value:totalPlays.toLocaleString(),sub:rangeLabel,icon:"play"},{label:"Winners",value:totalWinners.toLocaleString(),sub:rangeLabel,icon:"winner"},{label:"Win Rate",value:`${winRate.toFixed(1)}%`,sub:"Winners ÷ filtered plays",icon:"rate"},{label:"Prizes Remaining",value:remaining.toLocaleString(),sub:unlimited?`Plus ${unlimited} unlimited prize${unlimited===1?"":"s"}`:"Active finite inventory",icon:"prize"}];
 return <><div className="admin-header"><div><div className="eyebrow">DASHBOARD</div><h1>Mini-Game Hub</h1><p>Welcome back, {user.email}</p></div><div className="admin-dashboard-actions">{role!=="viewer"&&<DashboardQuickActions/>}<DashboardAlerts alerts={alerts}/><span className="status-pill">{role.toUpperCase()}</span></div></div>{hasError&&<div className="error-box">Some dashboard information could not be loaded.</div>}
 <form method="get" className="admin-panel" style={{marginBottom:20,padding:14,display:"flex",gap:10,alignItems:"end",flexWrap:"wrap"}}><div style={{minWidth:150}}><label style={{display:"block",fontSize:11,fontWeight:800,color:"#6b7280",marginBottom:5}}>DATE RANGE</label><select name="range" defaultValue={range} style={{width:"100%",padding:"9px 10px",border:"1px solid #d1d5db",borderRadius:8,background:"white"}}><option value="today">Today</option><option value="7d">Last 7 Days</option><option value="30d">Last 30 Days</option><option value="all">All Time</option><option value="custom">Custom Range</option></select></div><div style={{minWidth:145}}><label style={{display:"block",fontSize:11,fontWeight:800,color:"#6b7280",marginBottom:5}}>FROM</label><input type="date" name="from" defaultValue={customFrom} style={{width:"100%",padding:"8px 10px",border:"1px solid #d1d5db",borderRadius:8,background:"white"}}/></div><div style={{minWidth:145}}><label style={{display:"block",fontSize:11,fontWeight:800,color:"#6b7280",marginBottom:5}}>TO</label><input type="date" name="to" defaultValue={customTo} min={customFrom||undefined} style={{width:"100%",padding:"8px 10px",border:"1px solid #d1d5db",borderRadius:8,background:"white"}}/></div><div style={{minWidth:220,flex:"1 1 240px"}}><label style={{display:"block",fontSize:11,fontWeight:800,color:"#6b7280",marginBottom:5}}>CAMPAIGN</label><select name="campaign" defaultValue={selectedCampaign?.id??"all"} style={{width:"100%",padding:"9px 10px",border:"1px solid #d1d5db",borderRadius:8,background:"white"}}><option value="all">My Campaigns</option>{campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><button type="submit" className="primary-btn" style={{minHeight:38}}>Apply Filters</button>{(range!=="30d"||selectedCampaign||customFrom||customTo)&&<Link href="/admin" className="secondary-btn" style={{textDecoration:"none",minHeight:38,display:"inline-flex",alignItems:"center"}}>Reset</Link>}<div style={{marginLeft:"auto",fontSize:12,color:"#6b7280",paddingBottom:9}}><strong>{rangeLabel}</strong>{selectedCampaign?` · ${selectedCampaign.name}`:" · My Campaigns"}</div></form>
 {range==="custom"&&!customValid&&<div className="error-box" style={{marginBottom:20}}>Select a valid From and To date for the custom range.</div>}
 <section style={{marginBottom:24}}><h2 style={{margin:"0 0 4px"}}>Overview</h2><p style={{margin:"0 0 12px",color:"#6b7280",fontSize:13}}>Dashboard metrics for the selected period and campaign.</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:14}}>{cards.map(x=><div key={x.label} style={card}><div style={{display:"flex",justifyContent:"space-between",gap:12}}><span style={{fontSize:12,fontWeight:800,color:"#6b7280",textTransform:"uppercase"}}>{x.label}</span><span style={{color:"#6b7280"}}><Icon type={x.icon}/></span></div><strong style={{display:"block",fontSize:30,marginTop:7}}>{x.value}</strong><span style={{fontSize:12,color:"#6b7280"}}>{x.sub}</span></div>)}</div></section>
 <LiveCampaignOverview campaigns={liveRows}/>
 <div style={{display:"grid",gridTemplateColumns:"minmax(0,2fr) minmax(260px,1fr)",gap:18,marginBottom:22}}><div className="admin-panel" style={{margin:0}}><div style={{display:"flex",justifyContent:"space-between"}}><div><h2 style={{margin:"0 0 4px"}}>Campaign Performance</h2><p style={{margin:0,color:"#6b7280"}}>Top campaigns for {rangeLabel.toLowerCase()}.</p></div><Link href="/admin/campaigns" className="secondary-btn" style={{textDecoration:"none"}}>View Campaigns</Link></div>{!performance.length?<p className="empty">No campaign activity in this period.</p>:<div style={{overflowX:"auto"}}><table><thead><tr><th>Campaign</th><th>Status</th><th>Participants</th><th>Plays</th><th>Winners</th><th>Win Rate</th></tr></thead><tbody>{performance.map(c=><tr key={c.id}><td><Link href={`/admin/campaigns/${c.id}`}>{c.name}</Link></td><td>{label(c.status)}</td><td>{c.participants}</td><td>{c.spins}</td><td>{c.winners}</td><td>{c.winRate.toFixed(1)}%</td></tr>)}</tbody></table></div>}</div><div className="admin-panel" style={{margin:0}}><h2 style={{marginTop:0}}>Campaign Status</h2><div style={{display:"grid",gap:9}}>{["active","scheduled","paused","draft","ended"].map(s=><div key={s} style={{display:"flex",justifyContent:"space-between",padding:"10px 12px",border:"1px solid #e5e7eb",borderRadius:9}}><span>{label(s)}</span><strong>{statusCounts[s]||0}</strong></div>)}</div></div></div>
 <RecentActivity rows={recent}/></>}
