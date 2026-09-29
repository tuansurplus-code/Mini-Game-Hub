import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

type GameRecord = {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
};

type CampaignRecord = {
  id: string;
  name: string;
  slug: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
};

type CampaignGame = {
  id: string;
  public_slug: string;
  status: string;
  appearance: Record<string, unknown> | null;
  rules: Record<string, unknown> | null;
  campaigns: CampaignRecord | CampaignRecord[] | null;
  games: GameRecord | GameRecord[] | null;
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
  value: Record<string, unknown> | null
): AppearanceSettings {
  if (!value) {
    return defaultAppearance;
  }

  return {
    title:
      typeof value.title === "string"
        ? value.title
        : defaultAppearance.title,

    subtitle:
      typeof value.subtitle === "string"
        ? value.subtitle
        : defaultAppearance.subtitle,

    button_text:
      typeof value.button_text === "string"
        ? value.button_text
        : defaultAppearance.button_text,

    page_background_color:
      typeof value.page_background_color === "string"
        ? value.page_background_color
        : defaultAppearance.page_background_color,

    button_color:
      typeof value.button_color === "string"
        ? value.button_color
        : defaultAppearance.button_color,

    button_text_color:
      typeof value.button_text_color === "string"
        ? value.button_text_color
        : defaultAppearance.button_text_color,
  };
}

export default async function PublicGamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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
        campaigns (
          id,
          name,
          slug,
          status,
          starts_at,
          ends_at
        ),
        games (
          id,
          name,
          slug,
          type,
          description
        )
      `
    )
    .eq("public_slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !campaignGame) {
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

  const { data: prizes } = await supabase
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

  const appearance = getAppearance(
    typedCampaignGame.appearance
  );

  const activePrizes =
    (prizes ?? []) as Prize[];

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor:
          appearance.page_background_color,
        color: "#111111",
        padding: "32px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          margin: "0 auto",
        }}
      >
        <section
          style={{
            textAlign: "center",
            marginBottom: "32px",
          }}
        >
          <h1
            style={{
              fontSize: "42px",
              fontWeight: 800,
              margin: "0 0 10px",
            }}
          >
            {appearance.title}
          </h1>

          <p
            style={{
              fontSize: "18px",
              margin: 0,
              opacity: 0.75,
            }}
          >
            {appearance.subtitle}
          </p>

          <p
            style={{
              marginTop: "12px",
              fontSize: "14px",
              opacity: 0.6,
            }}
          >
            {game.name}
          </p>
        </section>

        <section
          style={{
            background: "#ffffff",
            borderRadius: "24px",
            padding: "32px 24px",
            boxShadow:
              "0 10px 40px rgba(0,0,0,0.08)",
            textAlign: "center",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "260px",
              height: "260px",
              margin: "0 auto 28px",
              borderRadius: "50%",
              border: "10px solid #eeeeee",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "conic-gradient(#e31b23 0deg 60deg, #ffffff 60deg 120deg, #e31b23 120deg 180deg, #ffffff 180deg 240deg, #e31b23 240deg 300deg, #ffffff 300deg 360deg)",
              boxShadow:
                "0 8px 24px rgba(0,0,0,0.12)",
            }}
          >
            <div
              style={{
                width: "92px",
                height: "92px",
                borderRadius: "50%",
                background: appearance.button_color,
                color: appearance.button_text_color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "14px",
                textAlign: "center",
              }}
            >
              READY
            </div>
          </div>

          <p
            style={{
              margin: "0 0 20px",
              fontSize: "15px",
              opacity: 0.7,
            }}
          >
            Enter your mobile number to play.
          </p>

          <button
            type="button"
            disabled
            style={{
              width: "100%",
              maxWidth: "320px",
              border: "none",
              borderRadius: "12px",
              padding: "16px 24px",
              background: appearance.button_color,
              color: appearance.button_text_color,
              fontSize: "17px",
              fontWeight: 700,
              cursor: "not-allowed",
              opacity: 0.65,
            }}
          >
            {appearance.button_text}
          </button>

          <p
            style={{
              marginTop: "14px",
              fontSize: "13px",
              opacity: 0.55,
            }}
          >
            Game play will be enabled in the next step.
          </p>
        </section>

        {activePrizes.length > 0 && (
          <section
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "24px",
              boxShadow:
                "0 8px 30px rgba(0,0,0,0.06)",
            }}
          >
            <h2
              style={{
                margin: "0 0 20px",
                fontSize: "24px",
                fontWeight: 800,
              }}
            >
              Prizes
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
              }}
            >
              {activePrizes.map((prize) => (
                <div
                  key={prize.id}
                  style={{
                    border: "1px solid #eeeeee",
                    borderRadius: "14px",
                    padding: "16px",
                  }}
                >
                  {prize.image_url && (
                    <img
                      src={prize.image_url}
                      alt={prize.name}
                      style={{
                        width: "100%",
                        height: "140px",
                        objectFit: "contain",
                        marginBottom: "12px",
                      }}
                    />
                  )}

                  <h3
                    style={{
                      margin: "0 0 6px",
                      fontSize: "17px",
                      fontWeight: 700,
                    }}
                  >
                    {prize.name}
                  </h3>

                  {prize.description && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        opacity: 0.7,
                      }}
                    >
                      {prize.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
