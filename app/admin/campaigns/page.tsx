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
      "id, name, slug, status, starts_at, ends_at, created_at"
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
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Start</th>
                <th>End</th>
              </tr>
            </thead>

            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td>
                    <strong>{campaign.name}</strong>
                  </td>

                  <td>{campaign.slug}</td>

                  <td>
                    <span className="tag">
                      {campaign.status}
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
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">
            No campaigns have been created yet.
          </div>
        )}
      </div>
    </>
  );
}
