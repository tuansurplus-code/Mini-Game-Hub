import Link from "next/link";
import { requireAdmin } from "../../lib/admin-auth";
import { createSupabaseServerClient } from "../../lib/supabase-server";

type DashboardStats = {
  total_games: number;
  active_campaigns: number;
  total_participants: number;
  total_spins: number;
  total_winners: number;
  active_coupons: number;
  redeemed_coupons: number;
  prizes_distributed: number;
};

type CampaignOverview = {
  campaign_id: string;
  total_participants: number | string;
  total_spins: number | string;
  total_winners: number | string;
  winning_rate: number | string;
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

type ReportingRow = {
  session_id: string;
  played_at: string;
  mobile: string;
  customer_name: string | null;
  campaign_name: string;
  game_name: string;
  result_type: string;
  prize_name: string | null;
};

function statusLabel(status: string) {
  return status.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-LK", {
    timeZone: "Asia/Colombo",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default async function AdminDashboard() {
  const { user, role } = await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const [statsResult, campaignsResult, overviewResult, reportingResult] = await Promise.all([
    supabase.rpc("get_dashboard_stats"),
    supabase
      .from("campaigns")
      .select("id,name,status,starts_at,ends_at,created_at")
      .order("created_at", { ascending: false }),
    supabase.rpc("get_campaign_overview_reporting"),
    supabase.rpc("get_game_reporting"),
  ]);

  const stats: DashboardStats = statsResult.data?.[0] ?? {
    total_games: 0,
    active_campaigns: 0,
    total_participants: 0,
    total_spins: 0,
    total_winners: 0,
    active_coupons: 0,
    redeemed_coupons: 0,
    prizes_distributed: 0,
  };

  const campaigns = (campaignsResult.data ?? []) as Campaign[];
  const overview = (overviewResult.data ?? []) as CampaignOverview[];
  const reporting = (reportingResult.data ?? []) as ReportingRow[];
  const hasError = statsResult.error || campaignsResult.error || overviewResult.error || reportingResult.error;

  const totalSpins = Number(stats.total_spins || 0);
  const totalWinners = Number(stats.total_winners || 0);
  const winRate = totalSpins ? (totalWinners / totalSpins) * 100 : 0;

  const statusCounts = campaigns.reduce<Record<string, number>>((acc, campaign) => {
    acc[campaign.status] = (acc[campaign.status] || 0) + 1;
    return acc;
  }, {});

  const overviewMap = new Map(overview.map((row) => [row.campaign_id, row]));
  const campaignPerformance = campaigns
    .map((campaign) => {
      const row = overviewMap.get(campaign.id);
      return {
        ...campaign,
        participants: Number(row?.total_participants ?? 0),
        spins: Number(row?.total_spins ?? 0),
        winners: Number(row?.total_winners ?? 0),
        winRate: Number(row?.winning_rate ?? 0),
      };
    })
    .sort((a, b) => b.spins - a.spins)
    .slice(0, 5);

  const recentActivity = reporting.slice(0, 8);
  const cardStyle = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "18px" };
  const quickLinkStyle = { textDecoration: "none", padding: "12px 16px", border: "1px solid #d1d5db", borderRadius: "10px", fontWeight: 700, color: "inherit", background: "#fff" };

  return (
    <>
      <div className="admin-header">
        <div>
          <div className="eyebrow">DASHBOARD</div>
          <h1>Mini-Game Hub</h1>
          <p>Welcome back, {user.email}</p>
        </div>
        <div><span className="status-pill">{role.toUpperCase()}</span></div>
      </div>

      {hasError && <div className="error-box">Some dashboard information could not be loaded.</div>}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:"14px",marginBottom:"22px"}}>
        {[
          ["Active Campaigns", stats.active_campaigns],
          ["Total Participants", stats.total_participants],
          ["Total Plays", stats.total_spins],
          ["Total Winners", stats.total_winners],
          ["Overall Win Rate", `${winRate.toFixed(1)}%`],
        ].map(([label, value]) => (
          <div key={String(label)} style={cardStyle}>
            <span style={{display:"block",fontSize:"12px",fontWeight:800,color:"#6b7280",textTransform:"uppercase"}}>{label}</span>
            <strong style={{display:"block",fontSize:"30px",marginTop:"6px"}}>{value}</strong>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"minmax(0,2fr) minmax(260px,1fr)",gap:"18px",marginBottom:"22px"}}>
        <div className="admin-panel" style={{margin:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",marginBottom:"12px"}}>
            <div><h2 style={{margin:"0 0 4px"}}>Campaign Performance</h2><p style={{margin:0,color:"#6b7280"}}>Top campaigns by total plays.</p></div>
            <Link href="/admin/campaigns" className="secondary-btn" style={{textDecoration:"none",whiteSpace:"nowrap"}}>View Campaigns</Link>
          </div>
          {campaignPerformance.length === 0 ? <p className="empty">No campaigns available.</p> : (
            <div style={{overflowX:"auto"}}><table><thead><tr><th>Campaign</th><th>Status</th><th>Participants</th><th>Plays</th><th>Winners</th><th>Win Rate</th></tr></thead><tbody>
              {campaignPerformance.map((campaign) => <tr key={campaign.id}>
                <td><Link href={`/admin/campaigns/${campaign.id}`} style={{fontWeight:700}}>{campaign.name}</Link></td>
                <td>{statusLabel(campaign.status)}</td><td>{campaign.participants}</td><td>{campaign.spins}</td><td>{campaign.winners}</td><td>{campaign.winRate.toFixed(1)}%</td>
              </tr>)}
            </tbody></table></div>
          )}
        </div>

        <div className="admin-panel" style={{margin:0}}>
          <h2 style={{marginTop:0}}>Campaign Status</h2>
          <p style={{color:"#6b7280",marginTop:"-4px"}}>Current campaign distribution.</p>
          <div style={{display:"grid",gap:"9px"}}>
            {["active","scheduled","paused","draft","ended"].map((status) => (
              <div key={status} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",border:"1px solid #e5e7eb",borderRadius:"9px"}}>
                <span>{statusLabel(status)}</span><strong>{statusCounts[status] || 0}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-panel" style={{marginBottom:"22px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",marginBottom:"12px"}}>
          <div><h2 style={{margin:"0 0 4px"}}>Recent Activity</h2><p style={{margin:0,color:"#6b7280"}}>Latest completed game activity across campaigns.</p></div>
          <Link href="/admin/winners" className="secondary-btn" style={{textDecoration:"none",whiteSpace:"nowrap"}}>Open Reporting</Link>
        </div>
        {recentActivity.length === 0 ? <p className="empty">No recent game activity.</p> : (
          <div style={{overflowX:"auto"}}><table><thead><tr><th>Date</th><th>Customer</th><th>Campaign</th><th>Game</th><th>Result</th><th>Prize</th></tr></thead><tbody>
            {recentActivity.map((row) => <tr key={row.session_id}><td style={{whiteSpace:"nowrap"}}>{formatDate(row.played_at)}</td><td>{row.customer_name || row.mobile || "—"}</td><td>{row.campaign_name}</td><td>{row.game_name}</td><td>{row.result_type === "win" ? "Winning" : row.result_type === "no_prize" ? "No Prize" : statusLabel(row.result_type)}</td><td>{row.prize_name || "—"}</td></tr>)}
          </tbody></table></div>
        )}
      </div>

      <div className="admin-panel">
        <h2 style={{marginTop:0}}>Quick Actions</h2>
        <p style={{color:"#6b7280"}}>Jump directly to the most common Mini-Game Hub tasks.</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:"10px"}}>
          <Link href="/admin/campaigns" style={quickLinkStyle}>Create / Manage Campaigns</Link>
          <Link href="/admin/games" style={quickLinkStyle}>Manage Games</Link>
          <Link href="/admin/prizes" style={quickLinkStyle}>Manage Prizes</Link>
          <Link href="/admin/winners" style={quickLinkStyle}>View Reporting</Link>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:"16px",marginTop:"18px",paddingTop:"16px",borderTop:"1px solid #e5e7eb",fontSize:"13px",color:"#6b7280"}}>
          <span>Total Games: <strong style={{color:"inherit"}}>{stats.total_games}</strong></span>
          <span>Active Coupons: <strong style={{color:"inherit"}}>{stats.active_coupons}</strong></span>
          <span>Redeemed Coupons: <strong style={{color:"inherit"}}>{stats.redeemed_coupons}</strong></span>
          <span>Prizes Distributed: <strong style={{color:"inherit"}}>{stats.prizes_distributed}</strong></span>
        </div>
      </div>
    </>
  );
}
