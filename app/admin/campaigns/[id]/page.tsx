import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";
import CampaignEditForm from "./CampaignEditForm";
import PublicCampaignAccess from "./PublicCampaignAccess";
import PublicGameAccess from "./PublicGameAccess";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CampaignEditPage({
  params,
}: PageProps) {
  const { id } = await params;
  const { workspaceId } = await requireAdmin();

  const supabase = await createSupabaseServerClient();

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select(
      `
        id,
        name,
        slug,
        status,
        scheduling_mode,
        starts_at,
        ends_at,
        created_at
      `
    )
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error || !campaign) {
    notFound();
  }

  const { data: campaignGames, error: campaignGamesError } =
    await supabase
      .from("campaign_games")
      .select(
        `
          id,
          campaign_id,
          game_id,
          public_slug,
          status,
          display_order,
          appearance,
          rules,
          created_at,
          updated_at,
          games (
            id,
            name,
            slug,
            type,
            description,
            status,
            default_config
          )
        `
      )
      .eq("campaign_id", id)
      .order("display_order", { ascending: true });

  if (campaignGamesError) {
    throw new Error("Failed to load campaign games.");
  }

  const now = new Date();
  const startsAt = campaign.starts_at ? new Date(campaign.starts_at) : null;
  const endsAt = campaign.ends_at ? new Date(campaign.ends_at) : null;
  const campaignPubliclyAvailable =
    campaign.status === "active" &&
    (!startsAt || startsAt <= now) &&
    (!endsAt || endsAt >= now);

  return (
    <>
      <div className="admin-header">
        <div>
          <div className="eyebrow">
            CAMPAIGN MANAGEMENT
          </div>

          <h1>Edit Campaign</h1>

          <p>
            Update the campaign name, scheduling mode,
            schedule and status.
          </p>
        </div>
      </div>

      <CampaignEditForm
        campaign={campaign}
        campaignGames={campaignGames ?? []}
      />

      <section
        className="admin-panel"
        style={{ marginTop: 24 }}
      >
        <div className="eyebrow">CAMPAIGN PUBLIC URL</div>
        <h2 style={{ marginBottom: 6 }}>Customer Campaign Page</h2>
        <p style={{ marginTop: 0, color: "#666", fontSize: 14 }}>
          Share one campaign link so customers can choose from all published games in this campaign.
        </p>

        <PublicCampaignAccess
          campaignSlug={campaign.slug}
          available={campaignPubliclyAvailable}
        />
      </section>

      {(campaignGames ?? []).length > 0 && (
        <section
          className="admin-panel"
          style={{ marginTop: 24 }}
        >
          <div className="eyebrow">PUBLIC ACCESS</div>
          <h2 style={{ marginBottom: 6 }}>Customer Game Links</h2>
          <p style={{ marginTop: 0, color: "#666", fontSize: 14 }}>
            Copy a published game link or open the customer view in a new tab.
          </p>

          <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
            {(campaignGames ?? []).map((campaignGame) => {
              const game = Array.isArray(campaignGame.games)
                ? campaignGame.games[0]
                : campaignGame.games;
              const published = campaignGame.status === "published";

              return (
                <div
                  key={campaignGame.id}
                  style={{
                    padding: 16,
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    background: "#fff",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>
                    {game?.name ?? "Campaign Game"}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 13,
                      color: "#666",
                      wordBreak: "break-word",
                    }}
                  >
                    /play/{campaignGame.public_slug} · {published ? "Published" : "Not Published"}
                  </div>
                  <PublicGameAccess
                    campaignGameId={campaignGame.id}
                    publicSlug={campaignGame.public_slug}
                    published={published}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
