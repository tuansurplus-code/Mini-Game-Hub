import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";
import CampaignEditForm from "./CampaignEditForm";

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
    </>
  );
}
