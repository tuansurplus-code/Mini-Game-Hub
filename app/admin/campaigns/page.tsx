import Link from "next/link";
import { requireAdmin } from "../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import CampaignForm from "./CampaignForm";

function formatCampaignDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-LK", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatStatus(status: string) {
  switch (status) {
    case "draft": return "Draft";
    case "scheduled": return "Scheduled";
    case "active": return "Active";
    case "ended": return "Ended";
    case "archived": return "Archived";
    default:
      return status.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}

type GameRecord = {
  id: string;
  name: string;
  type: string;
};

type CampaignGameRecord = {
  id: string;
  status: string;
  public_slug: string | null;
  game_id: string;
  games: GameRecord | GameRecord[] | null;
};

type CampaignOverviewRecord = {
  campaign_id: string;
  total_participants: number | string;
  total_spins: number | string;
  total_winners: number | string;
  winning_rate: number | string;
};

export default async function CampaignsPage() {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();

  const [{ data: campaigns, error }, { data: overviewData, error: overviewError }] = await Promise.all([
    supabase
      .from("campaigns")
      .select(`
        id,
        name,
        slug,
        status,
        scheduling_mode,
        starts_at,
        ends_at,
        created_at,
        campaign_games (
          id,
          status,
          public_slug,
          game_id,
          games (
            id,
            name,
            type
          )
        )
      `)
      .order("created_at", { ascending: false }),
    supabase.rpc("get_campaign_overview_reporting"),
  ]);

  if (error) throw new Error(error.message);
  if (overviewError) throw new Error(overviewError.message);

  const overviewByCampaign = new Map(
    ((overviewData ?? []) as CampaignOverviewRecord[]).map((row) => [row.campaign_id, row])
  );

  const headerStyle = {
    textAlign: "left" as const,
    padding: "12px",
    borderBottom: "1px solid #ddd",
    whiteSpace: "nowrap" as const,
  };

  const cellStyle = {
    padding: "12px",
    borderBottom: "1px solid #eee",
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1 style={{ marginBottom: "6px" }}>Campaigns</h1>
          <p style={{ margin: 0, color: "#666" }}>
            Manage promotional campaigns, schedules and performance.
          </p>
        </div>
        <CampaignForm />
      </div>

      <div className="admin-panel">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1450px" }}>
            <thead>
              <tr>
                <th style={headerStyle}>Campaign</th>
                <th style={headerStyle}>Game</th>
                <th style={headerStyle}>Status</th>
                <th style={headerStyle}>Participants</th>
                <th style={headerStyle}>Spins</th>
                <th style={headerStyle}>Winners</th>
                <th style={headerStyle}>Winning Rate</th>
                <th style={headerStyle}>Scheduling</th>
                <th style={headerStyle}>Public Slug</th>
                <th style={headerStyle}>Start</th>
                <th style={headerStyle}>End</th>
                <th style={headerStyle}>Action</th>
              </tr>
            </thead>

            <tbody>
              {!campaigns || campaigns.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: "32px 12px", textAlign: "center", color: "#666" }}>
                    No campaigns found.
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => {
                  const campaignGames = Array.isArray(campaign.campaign_games)
                    ? (campaign.campaign_games as CampaignGameRecord[])
                    : [];
                  const firstCampaignGame = campaignGames[0];
                  const game = firstCampaignGame?.games;
                  const gameRecord = Array.isArray(game) ? game[0] : game;
                  const gameName = gameRecord?.name;
                  const gameType = gameRecord?.type;
                  const publicSlug = firstCampaignGame?.public_slug || "—";
                  const automatic = campaign.scheduling_mode === "automatic";
                  const overview = overviewByCampaign.get(campaign.id);
                  const participants = Number(overview?.total_participants ?? 0);
                  const spins = Number(overview?.total_spins ?? 0);
                  const winners = Number(overview?.total_winners ?? 0);
                  const winningRate = Number(overview?.winning_rate ?? 0);

                  return (
                    <tr key={campaign.id}>
                      <td style={cellStyle}>
                        <strong>{campaign.name}</strong>
                        <div style={{ marginTop: "4px", color: "#888", fontSize: "12px" }}>
                          {campaign.slug}
                        </div>
                      </td>

                      <td style={cellStyle}>
                        {gameName || "No game assigned"}
                        {gameType && (
                          <div style={{ marginTop: "4px", color: "#888", fontSize: "12px" }}>
                            {gameType}
                          </div>
                        )}
                      </td>

                      <td style={cellStyle}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 8px",
                            borderRadius: "999px",
                            background: "#f3f3f3",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          {formatStatus(campaign.status)}
                        </span>
                      </td>

                      <td style={{ ...cellStyle, fontWeight: 700 }}>{participants.toLocaleString()}</td>
                      <td style={{ ...cellStyle, fontWeight: 700 }}>{spins.toLocaleString()}</td>
                      <td style={{ ...cellStyle, fontWeight: 700 }}>{winners.toLocaleString()}</td>
                      <td style={{ ...cellStyle, fontWeight: 700 }}>{winningRate.toFixed(1)}%</td>

                      <td style={cellStyle}>
                        <span style={{ fontWeight: automatic ? 600 : 400 }}>
                          {automatic ? "Automatic" : "Manual"}
                        </span>
                        {automatic && (
                          <div style={{ marginTop: "4px", color: "#888", fontSize: "12px" }}>
                            Date-based
                          </div>
                        )}
                      </td>

                      <td style={{ ...cellStyle, fontSize: "13px" }}>
                        {publicSlug === "—" ? "—" : <code>{publicSlug}</code>}
                      </td>

                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                        {formatCampaignDate(campaign.starts_at)}
                      </td>

                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                        {formatCampaignDate(campaign.ends_at)}
                      </td>

                      <td style={cellStyle}>
                        <Link
                          href={`/admin/campaigns/${campaign.id}`}
                          className="secondary-btn"
                          style={{ display: "inline-block", textDecoration: "none", whiteSpace: "nowrap" }}
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
