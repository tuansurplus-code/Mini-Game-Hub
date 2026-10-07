import Link from "next/link";
import { requireAdmin } from "../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import CampaignForm from "./CampaignForm";
import DuplicateCampaignButton from "./DuplicateCampaignButton";
import CampaignPublicActions from "./CampaignPublicActions";
import CampaignControls from "./CampaignControls";

function formatCampaignDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-LK", { timeZone: "Asia/Colombo", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}
function formatStatus(status: string) {
  switch (status) {
    case "draft": return "Draft"; case "scheduled": return "Scheduled"; case "active": return "Active"; case "paused": return "Paused"; case "ended": return "Ended"; case "archived": return "Archived";
    default: return status.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
type GameRecord = { id: string; name: string; type: string };
type CampaignGameRecord = { id: string; status: string; public_slug: string | null; game_id: string; games: GameRecord | GameRecord[] | null };
type CampaignOverviewRecord = { campaign_id: string; total_participants: number | string; total_spins: number | string; total_winners: number | string; winning_rate: number | string };

export default async function CampaignsPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const [{ data: campaigns, error }, { data: overviewData, error: overviewError }] = await Promise.all([
    supabase.from("campaigns").select(`id, name, slug, status, scheduling_mode, starts_at, ends_at, created_at, campaign_games (id, status, public_slug, game_id, games ( id, name, type ))`).order("created_at", { ascending: false }),
    supabase.rpc("get_campaign_overview_reporting"),
  ]);
  if (error) throw new Error(error.message);
  if (overviewError) throw new Error(overviewError.message);
  const overviewByCampaign = new Map(((overviewData ?? []) as CampaignOverviewRecord[]).map((row) => [row.campaign_id, row]));
  const headerStyle = { textAlign: "left" as const, padding: "12px", borderBottom: "1px solid #ddd", whiteSpace: "nowrap" as const };
  const cellStyle = { padding: "12px", borderBottom: "1px solid #eee", verticalAlign: "middle" as const };

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"16px",marginBottom:"24px"}}><div><h1 style={{marginBottom:"6px"}}>Campaigns</h1><p style={{margin:0,color:"#666"}}>Manage promotional campaigns, schedules and performance.</p></div><CampaignForm /></div>
    <div className="admin-panel"><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:"1100px"}}><thead><tr><th style={headerStyle}>Campaign</th><th style={headerStyle}>Game</th><th style={headerStyle}>Status</th><th style={headerStyle}>Performance</th><th style={headerStyle}>Scheduling</th><th style={headerStyle}>Customer Link</th><th style={headerStyle}>Start</th><th style={headerStyle}>End</th><th style={headerStyle}>Action</th></tr></thead><tbody>
      {!campaigns || campaigns.length===0?<tr><td colSpan={9} style={{padding:"32px 12px",textAlign:"center",color:"#666"}}>No campaigns found.</td></tr>:campaigns.map((campaign)=>{
        const campaignGames=Array.isArray(campaign.campaign_games)?campaign.campaign_games as CampaignGameRecord[]:[]; const firstCampaignGame=campaignGames[0]; const game=firstCampaignGame?.games; const gameRecord=Array.isArray(game)?game[0]:game; const gameName=gameRecord?.name; const gameType=gameRecord?.type; const publicSlug=firstCampaignGame?.public_slug||null; const automatic=campaign.scheduling_mode==="automatic"; const overview=overviewByCampaign.get(campaign.id); const participants=Number(overview?.total_participants??0); const spins=Number(overview?.total_spins??0); const winners=Number(overview?.total_winners??0); const winningRate=Number(overview?.winning_rate??0);
        return <tr key={campaign.id}>
          <td style={cellStyle}><strong>{campaign.name}</strong><div style={{marginTop:"4px",color:"#888",fontSize:"12px"}}>{campaign.slug}</div></td>
          <td style={cellStyle}>{gameName||"No game assigned"}{gameType&&<div style={{marginTop:"4px",color:"#888",fontSize:"12px"}}>{gameType}</div>}</td>
          <td style={cellStyle}><span style={{display:"inline-block",padding:"4px 8px",borderRadius:"999px",background:"#f3f3f3",fontSize:"12px",fontWeight:600}}>{formatStatus(campaign.status)}</span></td>
          <td style={cellStyle}><div style={{display:"grid",gridTemplateColumns:"auto auto",gap:"3px 12px",fontSize:"12px",whiteSpace:"nowrap"}}><span style={{color:"#777"}}>Participants</span><strong>{participants.toLocaleString()}</strong><span style={{color:"#777"}}>Spins</span><strong>{spins.toLocaleString()}</strong><span style={{color:"#777"}}>Winners</span><strong>{winners.toLocaleString()}</strong><span style={{color:"#777"}}>Win Rate</span><strong>{winningRate.toFixed(1)}%</strong></div></td>
          <td style={cellStyle}><span style={{fontWeight:automatic?600:400}}>{automatic?"Automatic":"Manual"}</span>{automatic&&<div style={{marginTop:"4px",color:"#888",fontSize:"12px"}}>Date-based</div>}</td>
          <td style={cellStyle}><CampaignPublicActions publicSlug={publicSlug}/></td><td style={{...cellStyle,whiteSpace:"nowrap",fontSize:"13px"}}>{formatCampaignDate(campaign.starts_at)}</td><td style={{...cellStyle,whiteSpace:"nowrap",fontSize:"13px"}}>{formatCampaignDate(campaign.ends_at)}</td>
          <td style={cellStyle}><div style={{display:"flex",flexDirection:"column",alignItems:"stretch",gap:"6px",width:"100px"}}><Link href={`/admin/campaigns/${campaign.id}`} className="secondary-btn" style={{display:"block",textDecoration:"none",whiteSpace:"nowrap",textAlign:"center",width:"100%"}}>Edit</Link><Link href={`/admin/campaigns/report?campaign=${encodeURIComponent(campaign.name)}`} className="secondary-btn" style={{display:"block",textDecoration:"none",whiteSpace:"nowrap",textAlign:"center",width:"100%"}}>Report</Link><CampaignControls campaignId={campaign.id} campaignName={campaign.name} status={campaign.status}/><DuplicateCampaignButton campaignId={campaign.id} campaignName={campaign.name}/></div></td>
        </tr>;
      })}
    </tbody></table></div></div>
  </div>;
}
