import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

type PageProps = { params: Promise<{ slug: string }> };
type LandingSettings = { subtitle?: string; background_color?: string; card_background_color?: string; text_color?: string; button_color?: string; button_text_color?: string };
type Campaign = { id: string; name: string; slug: string; status: string; starts_at: string | null; ends_at: string | null; settings: Record<string, unknown> | null };
type Game = { id: string; name: string; type: string; description: string | null };
type CampaignGame = { id: string; public_slug: string; status: string; display_order: number | null; games: Game | Game[] | null };

function getSingleRecord<T>(value: T | T[] | null): T | null { return Array.isArray(value) ? value[0] ?? null : value; }
function getGameLabel(type: string) { if (type === "spin") return "Spin & Win"; if (type === "scratch") return "Scratch & Win"; if (type === "pick_card" || type === "pick-card") return "Pick a Card"; return "Mini Game"; }
function getGameIcon(type: string) { if (type === "spin") return "↻"; if (type === "scratch") return "✦"; if (type === "pick_card" || type === "pick-card") return "▣"; return "★"; }

export default async function PublicCampaignPage({ params }: PageProps) {
  const { slug } = await params;
  if (!slug) notFound();
  const supabase = await createSupabaseServerClient();
  const { data: campaign, error } = await supabase.from("campaigns").select("id,name,slug,status,starts_at,ends_at,settings").eq("slug", slug).maybeSingle();
  if (error || !campaign) { if (error) console.error("Load public campaign error:", error); notFound(); }

  const typedCampaign = campaign as Campaign;
  const now = new Date();
  const startsAt = typedCampaign.starts_at ? new Date(typedCampaign.starts_at) : null;
  const endsAt = typedCampaign.ends_at ? new Date(typedCampaign.ends_at) : null;
  if (!(typedCampaign.status === "active" && (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now))) notFound();

  const { data: campaignGames, error: campaignGamesError } = await supabase.from("campaign_games").select(`id,public_slug,status,display_order,games!inner (id,name,type,description)`).eq("campaign_id", typedCampaign.id).eq("status", "published").order("display_order", { ascending: true });
  if (campaignGamesError) { console.error("Load public campaign games error:", campaignGamesError); notFound(); }
  const publishedGames = (campaignGames ?? []) as CampaignGame[];

  const settings = typedCampaign.settings && typeof typedCampaign.settings === "object" && !Array.isArray(typedCampaign.settings) ? typedCampaign.settings : {};
  const landing = settings.landing && typeof settings.landing === "object" && !Array.isArray(settings.landing) ? settings.landing as LandingSettings : {};
  const subtitle = landing.subtitle || "Choose a game and play for your chance to win exciting rewards.";
  const backgroundColor = landing.background_color || "#f4f6f8";
  const cardBackgroundColor = landing.card_background_color || "#ffffff";
  const textColor = landing.text_color || "#111827";
  const buttonColor = landing.button_color || "#e31b23";
  const buttonTextColor = landing.button_text_color || "#ffffff";

  return <main style={{ minHeight: "100vh", background: backgroundColor, padding: "56px 20px" }}>
    <div style={{ width: "100%", maxWidth: 1040, margin: "0 auto" }}>
      <header style={{ textAlign: "center", marginBottom: 34 }}>
        <h1 style={{ margin: 0, fontSize: "clamp(34px, 7vw, 54px)", lineHeight: 1.05, color: textColor, letterSpacing: "-0.035em" }}>{typedCampaign.name}</h1>
        {subtitle && <p style={{ margin: "14px auto 0", maxWidth: 600, color: textColor, opacity: 0.65, fontSize: 17, lineHeight: 1.6 }}>{subtitle}</p>}
      </header>

      {publishedGames.length > 0 ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        {publishedGames.map((campaignGame) => {
          const game = getSingleRecord(campaignGame.games); if (!game) return null;
          return <article key={campaignGame.id} style={{ display: "flex", flexDirection: "column", minHeight: 300, padding: 26, border: "1px solid rgba(128,128,128,.22)", borderRadius: 20, background: cardBackgroundColor, boxShadow: "0 10px 30px rgba(15,23,42,.06)" }}>
            <div style={{ width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 14, background: buttonColor, color: buttonTextColor, fontSize: 28, fontWeight: 800 }}>{getGameIcon(game.type)}</div>
            <div style={{ marginTop: 20, fontSize: 12, fontWeight: 800, color: buttonColor, textTransform: "uppercase", letterSpacing: ".1em" }}>{getGameLabel(game.type)}</div>
            <h2 style={{ margin: "7px 0 0", fontSize: 25, lineHeight: 1.2, color: textColor }}>{game.name}</h2>
            <p style={{ margin: "10px 0 22px", color: textColor, opacity: .65, lineHeight: 1.55, fontSize: 14 }}>{game.description || "Play now for your chance to win."}</p>
            <Link href={`/play/${campaignGame.public_slug}`} style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", marginTop: "auto", minHeight: 48, padding: "0 18px", borderRadius: 12, background: buttonColor, color: buttonTextColor, textDecoration: "none", fontWeight: 800, fontSize: 15 }}>Play Now →</Link>
          </article>;
        })}
      </div> : <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 24px", borderRadius: 16, background: cardBackgroundColor, color: textColor, textAlign: "center", fontSize: 15 }}>There are no games available in this campaign right now.</div>}
    </div>
  </main>;
}
