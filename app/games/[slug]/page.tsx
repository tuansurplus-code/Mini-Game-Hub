import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import SpinGameClient from "./SpinGameClient";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function GamePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: campaignGame, error } = await supabase
    .from("campaign_games")
    .select(
      `
        id,
        public_slug,
        status,
        appearance,
        rules,
        games (
          name,
          type,
          description
        ),
        campaigns (
          name,
          status,
          starts_at,
          ends_at
        )
      `
    )
    .eq("public_slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !campaignGame) {
    notFound();
  }

  const campaign = Array.isArray(campaignGame.campaigns)
    ? campaignGame.campaigns[0]
    : campaignGame.campaigns;

  const game = Array.isArray(campaignGame.games)
    ? campaignGame.games[0]
    : campaignGame.games;

  if (
    !campaign ||
    campaign.status !== "active" ||
    (campaign.starts_at && new Date(campaign.starts_at) > new Date()) ||
    (campaign.ends_at && new Date(campaign.ends_at) < new Date())
  ) {
    notFound();
  }

  const { data: prizes, error: prizesError } = await supabase
    .from("prizes")
    .select("id, name, description, image_url, weight, inventory")
    .eq("campaign_game_id", campaignGame.id)
    .eq("active", true)
    .gt("weight", 0)
    .order("created_at", { ascending: true });

  if (prizesError || !prizes || prizes.length === 0) {
    notFound();
  }

  const availablePrizes = prizes.filter(
    (prize) => prize.inventory === null || prize.inventory > 0
  );

  if (availablePrizes.length === 0) {
    notFound();
  }

  return (
    <SpinGameClient
      campaignGameId={campaignGame.id}
      title={game?.name ?? "Spin & Win"}
      description={
        game?.description ?? "Enter your mobile number and spin to win."
      }
      campaignName={campaign.name}
      prizes={availablePrizes.map((prize) => ({
        id: prize.id,
        name: prize.name,
        description: prize.description,
        image_url: prize.image_url,
        weight: Number(prize.weight),
      }))}
    />
  );
}
