import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import SpinAndWinGame from "../../../components/games/SpinAndWinGame";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
};

type Game = {
  id: string;
  name: string;
  type: string;
  description: string | null;
};

type CampaignGame = {
  id: string;
  public_slug: string;
  status: string;
  appearance: Record<string, unknown> | null;
  campaigns: Campaign | Campaign[] | null;
  games: Game | Game[] | null;
};

type Prize = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  weight: number;
  inventory: number | null;
  active: boolean;
};

type AppearanceSettings = {
  title: string;
  subtitle: string;
  button_text: string;
  page_background_color: string;
  button_color: string;
  button_text_color: string;
};

const defaultAppearance: AppearanceSettings = {
  title: "SPIN & WIN",
  subtitle: "Spin daily and win exciting rewards!",
  button_text: "SPIN NOW",
  page_background_color: "#ffffff",
  button_color: "#e31b23",
  button_text_color: "#ffffff",
};

function getSingleRecord<T>(
  value: T | T[] | null
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getAppearance(
  appearance: Record<string, unknown> | null
): AppearanceSettings {
  if (!appearance) {
    return defaultAppearance;
  }

  return {
    title:
      typeof appearance.title === "string"
        ? appearance.title
        : defaultAppearance.title,

    subtitle:
      typeof appearance.subtitle === "string"
        ? appearance.subtitle
        : defaultAppearance.subtitle,

    button_text:
      typeof appearance.button_text === "string"
        ? appearance.button_text
        : defaultAppearance.button_text,

    page_background_color:
      typeof appearance.page_background_color ===
      "string"
        ? appearance.page_background_color
        : defaultAppearance.page_background_color,

    button_color:
      typeof appearance.button_color === "string"
        ? appearance.button_color
        : defaultAppearance.button_color,

    button_text_color:
      typeof appearance.button_text_color ===
      "string"
        ? appearance.button_text_color
        : defaultAppearance.button_text_color,
  };
}

export default async function PlayGamePage({
  params,
}: PageProps) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  const supabase =
    await createSupabaseServerClient();

  const { data: campaignGame, error } =
    await supabase
      .from("campaign_games")
      .select(
        `
          id,
          public_slug,
          status,
          appearance,
          campaigns!inner (
            id,
            name,
            status,
            starts_at,
            ends_at
          ),
          games!inner (
            id,
            name,
            type,
            description
          )
        `
      )
      .eq("public_slug", slug)
      .eq("status", "published")
      .maybeSingle();

  if (error) {
    console.error(
      "Load public campaign game error:",
      error
    );

    notFound();
  }

  if (!campaignGame) {
    notFound();
  }

  const typedCampaignGame =
    campaignGame as CampaignGame;

  const campaign = getSingleRecord(
    typedCampaignGame.campaigns
  );

  const game = getSingleRecord(
    typedCampaignGame.games
  );

  if (!campaign || !game) {
    notFound();
  }

  const now = new Date();

  const startsAt = campaign.starts_at
    ? new Date(campaign.starts_at)
    : null;

  const endsAt = campaign.ends_at
    ? new Date(campaign.ends_at)
    : null;

  const campaignIsActive =
    campaign.status === "active" &&
    (!startsAt || startsAt <= now) &&
    (!endsAt || endsAt >= now);

  if (!campaignIsActive) {
    notFound();
  }

  const { data: prizes, error: prizesError } =
    await supabase
      .from("prizes")
      .select(
        `
          id,
          name,
          description,
          image_url,
          weight,
          inventory,
          active
        `
      )
      .eq(
        "campaign_game_id",
        typedCampaignGame.id
      )
      .eq("active", true)
      .order("created_at", {
        ascending: true,
      });

  if (prizesError) {
    console.error(
      "Load public game prizes error:",
      prizesError
    );

    notFound();
  }

  const appearance = getAppearance(
    typedCampaignGame.appearance
  );

  return (
    <SpinAndWinGame
      slug={typedCampaignGame.public_slug}
      gameName={game.name}
      prizes={(prizes ?? []) as Prize[]}
      appearance={appearance}
    />
  );
}
