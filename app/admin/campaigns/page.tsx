import Link from "next/link";
import { requireAdmin } from "../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import CampaignForm from "./CampaignForm";
import CampaignGameForm from "./CampaignGameForm";

export default async function CampaignsPage() {
  const { workspaceId } = await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select(
      `
        id,
        name,
        slug,
        status,
        starts_at,
        ends_at,
        created_at,
        campaign_games (
          id,
          public_slug,
          status,
          display_order,
          games (
            id,
            name,
            type,
            status
          )
        )
      `
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  return (
    <>
      <div className="admin-header">
        <div>
          <div className="eyebrow">CAMPAIGN MANAGEMENT</div>

          <h1>Campaigns</h1>

          <p>
            Create and manage promotional campaigns for your games.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <CampaignGameForm />
          <CampaignForm />
        </div>
      </div>

      {error && (
        <div className="error-box">
          Failed to load campaigns: {error.message}
        </div>
      )}

      <div className="admin-panel">
        {campaigns && campaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Game</th>
                  <th>Status</th>
                  <th>Public Slug</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {campaigns.map((campaign) => {
                  const campaignGames =
                    campaign.campaign_games ?? [];

                  if (campaignGames.length === 0) {
                    return (
                      <tr key={campaign.id}>
                        <td>
                          <strong>{campaign.name}</strong>

                          <div
                            style={{
                              fontSize: "12px",
                              color: "#777",
                              marginTop: "4px",
                            }}
                          >
                            {campaign.slug}
                          </div>
                        </td>

                        <td colSpan={3}>
                          <span
                            style={{
                              color: "#777",
                              fontSize: "13px",
                            }}
                          >
                            No games assigned
                          </span>
                        </td>

                        <td>
                          {campaign.starts_at
                            ? new Date(
                                campaign.starts_at
                              ).toLocaleString()
                            : "—"}
                        </td>

                        <td>
                          {campaign.ends_at
                            ? new Date(
                                campaign.ends_at
                              ).toLocaleString()
                            : "—"}
                        </td>

                        <td>
                          <Link
                            href={`/admin/campaigns/${campaign.id}`}
                            className="primary-btn"
                            style={{
                              display: "inline-block",
                              textDecoration: "none",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    );
                  }

                  return campaignGames.map(
                    (campaignGame, index) => {
                      const game = Array.isArray(
                        campaignGame.games
                      )
                        ? campaignGame.games[0]
                        : campaignGame.games;

                      return (
                        <tr key={campaignGame.id}>
                          <td>
                            {index === 0 && (
                              <>
                                <strong>
                                  {campaign.name}
                                </strong>

                                <div
                                  style={{
                                    fontSize: "12px",
                                    color: "#777",
                                    marginTop: "4px",
                                  }}
                                >
                                  {campaign.slug}
                                </div>
                              </>
                            )}
                          </td>

                          <td>
                            <strong>
                              {game?.name ??
                                "Unknown Game"}
                            </strong>

                            <div
                              style={{
                                fontSize: "12px",
                                color: "#777",
                                marginTop: "4px",
                              }}
                            >
                              {game?.type ?? "—"}
                            </div>
                          </td>

                          <td>
                            <span className="tag">
                              {campaignGame.status}
                            </span>
                          </td>

                          <td>
                            {campaignGame.public_slug}
                          </td>

                          <td>
                            {campaign.starts_at
                              ? new Date(
                                  campaign.starts_at
                                ).toLocaleString()
                              : "—"}
                          </td>

                          <td>
                            {campaign.ends_at
                              ? new Date(
                                  campaign.ends_at
                                ).toLocaleString()
                              : "—"}
                          </td>

                          <td>
                            {index === 0 && (
                              <Link
                                href={`/admin/campaigns/${campaign.id}`}
                                className="primary-btn"
                                style={{
                                  display: "inline-block",
                                  textDecoration: "none",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Edit
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    }
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            No campaigns have been created yet.
          </div>
        )}
      </div>
    </>
  );
}
