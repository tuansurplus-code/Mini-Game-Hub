import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type Campaign = {
  id: string;
  name: string;
  slug: string;
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
  display_order: number | null;
  games: Game | Game[] | null;
};

function getSingleRecord<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function PublicCampaignPage({ params }: PageProps) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("id,name,slug,status,starts_at,ends_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !campaign) {
    if (error) {
      console.error("Load public campaign error:", error);
    }
    notFound();
  }

  const typedCampaign = campaign as Campaign;
  const now = new Date();
  const startsAt = typedCampaign.starts_at
    ? new Date(typedCampaign.starts_at)
    : null;
  const endsAt = typedCampaign.ends_at
    ? new Date(typedCampaign.ends_at)
    : null;

  const isAvailable =
    typedCampaign.status === "active" &&
    (!startsAt || startsAt <= now) &&
    (!endsAt || endsAt >= now);

  if (!isAvailable) {
    notFound();
  }

  const { data: campaignGames, error: campaignGamesError } = await supabase
    .from("campaign_games")
    .select(
      `
        id,
        public_slug,
        status,
        display_order,
        games!inner (
          id,
          name,
          type,
          description
        )
      `
    )
    .eq("campaign_id", typedCampaign.id)
    .eq("status", "published")
    .order("display_order", { ascending: true });

  if (campaignGamesError) {
    console.error("Load public campaign games error:", campaignGamesError);
    notFound();
  }

  const publishedGames = (campaignGames ?? []) as CampaignGame[];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "48px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 18,
            padding: "32px 28px",
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.12em",
              color: "#e31b23",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Singhagiri Mini Game Hub
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(30px, 6vw, 48px)",
              lineHeight: 1.08,
              color: "#111827",
            }}
          >
            {typedCampaign.name}
          </h1>

          <p
            style={{
              margin: "14px 0 0",
              maxWidth: 620,
              color: "#6b7280",
              fontSize: 16,
              lineHeight: 1.6,
            }}
          >
            Choose a game and play for your chance to win exciting rewards.
          </p>

          {publishedGames.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
                marginTop: 28,
              }}
            >
              {publishedGames.map((campaignGame) => {
                const game = getSingleRecord(campaignGame.games);

                if (!game) {
                  return null;
                }

                return (
                  <article
                    key={campaignGame.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      padding: 20,
                      border: "1px solid #e5e7eb",
                      borderRadius: 14,
                      background: "#ffffff",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#e31b23",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {game.type}
                    </div>

                    <h2
                      style={{
                        margin: "8px 0 0",
                        fontSize: 22,
                        color: "#111827",
                      }}
                    >
                      {game.name}
                    </h2>

                    {game.description && (
                      <p
                        style={{
                          margin: "10px 0 0",
                          color: "#6b7280",
                          lineHeight: 1.55,
                          fontSize: 14,
                        }}
                      >
                        {game.description}
                      </p>
                    )}

                    <Link
                      href={`/play/${campaignGame.public_slug}`}
                      style={{
                        display: "inline-flex",
                        justifyContent: "center",
                        alignItems: "center",
                        marginTop: "auto",
                        padding: "12px 16px",
                        borderRadius: 9,
                        background: "#e31b23",
                        color: "#ffffff",
                        textDecoration: "none",
                        fontWeight: 800,
                        fontSize: 14,
                      }}
                    >
                      Play Now
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                marginTop: 28,
                padding: 20,
                borderRadius: 12,
                background: "#f9fafb",
                border: "1px dashed #d1d5db",
                color: "#6b7280",
                fontSize: 14,
              }}
            >
              There are no games available in this campaign right now.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
