import Link from "next/link";
import { requireAdmin } from "../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import CampaignForm from "./CampaignForm";

function formatCampaignDate(value: string | null) {
  if (!value) {
    return "—";
  }

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
    case "draft":
      return "Draft";

    case "scheduled":
      return "Scheduled";

    case "active":
      return "Active";

    case "ended":
      return "Ended";

    case "archived":
      return "Archived";

    default:
      return status
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

export default async function CampaignsPage() {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();

  const { data: campaigns, error } = await supabase
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
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

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
          <h1 style={{ marginBottom: "6px" }}>
            Campaigns
          </h1>

          <p style={{ margin: 0, color: "#666" }}>
            Manage promotional campaigns and their schedules.
          </p>
        </div>

        <CampaignForm />
      </div>

      <div className="admin-panel">
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "1050px",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Campaign
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "12px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Game
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "12px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Status
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "12px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Scheduling
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "12px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Public Slug
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "12px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Start
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "12px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  End
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "12px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {!campaigns || campaigns.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: "32px 12px",
                      textAlign: "center",
                      color: "#666",
                    }}
                  >
                    No campaigns found.
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => {
                  const campaignGames =
                    Array.isArray(campaign.campaign_games)
                      ? (campaign.campaign_games as CampaignGameRecord[])
                      : [];

                  const firstCampaignGame =
                    campaignGames[0];

                  const game = firstCampaignGame?.games;

                  const gameRecord = Array.isArray(game)
                    ? game[0]
                    : game;

                  const gameName =
                    gameRecord?.name;

                  const gameType =
                    gameRecord?.type;

                  const publicSlug =
                    firstCampaignGame?.public_slug ||
                    "—";

                  const automatic =
                    campaign.scheduling_mode ===
                    "automatic";

                  return (
                    <tr key={campaign.id}>
                      <td
                        style={{
                          padding: "12px",
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        <strong>
                          {campaign.name}
                        </strong>

                        <div
                          style={{
                            marginTop: "4px",
                            color: "#888",
                            fontSize: "12px",
                          }}
                        >
                          {campaign.slug}
                        </div>
                      </td>

                      <td
                        style={{
                          padding: "12px",
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        {gameName ||
                          "No game assigned"}

                        {gameType && (
                          <div
                            style={{
                              marginTop: "4px",
                              color: "#888",
                              fontSize: "12px",
                            }}
                          >
                            {gameType}
                          </div>
                        )}
                      </td>

                      <td
                        style={{
                          padding: "12px",
                          borderBottom: "1px solid #eee",
                        }}
                      >
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
                          {formatStatus(
                            campaign.status
                          )}
                        </span>
                      </td>

                      <td
                        style={{
                          padding: "12px",
                          borderBottom:
                            "1px solid #eee",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: automatic
                              ? 600
                              : 400,
                          }}
                        >
                          {automatic
                            ? "Automatic"
                            : "Manual"}
                        </span>

                        {automatic && (
                          <div
                            style={{
                              marginTop: "4px",
                              color: "#888",
                              fontSize: "12px",
                            }}
                          >
                            Date-based
                          </div>
                        )}
                      </td>

                      <td
                        style={{
                          padding: "12px",
                          borderBottom:
                            "1px solid #eee",
                          fontSize: "13px",
                        }}
                      >
                        {publicSlug === "—" ? (
                          "—"
                        ) : (
                          <code>
                            {publicSlug}
                          </code>
                        )}
                      </td>

                      <td
                        style={{
                          padding: "12px",
                          borderBottom:
                            "1px solid #eee",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatCampaignDate(
                          campaign.starts_at
                        )}
                      </td>

                      <td
                        style={{
                          padding: "12px",
                          borderBottom:
                            "1px solid #eee",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatCampaignDate(
                          campaign.ends_at
                        )}
                      </td>

                      <td
                        style={{
                          padding: "12px",
                          borderBottom:
                            "1px solid #eee",
                        }}
                      >
                        <Link
                          href={`/admin/campaigns/${campaign.id}`}
                          className="secondary-btn"
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
