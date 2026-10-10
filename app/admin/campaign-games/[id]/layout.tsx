import type { ReactNode } from "react";
import CampaignPrizeColors from "./CampaignPrizeColors";
import WheelCustomization from "./WheelCustomization";
import ScratchCustomization from "./ScratchCustomization";
import PickACardCustomization from "./PickACardCustomization";
import PrizeCouponSettings from "./PrizeCouponSettings";
import AutoCouponSettings from "./AutoCouponSettings";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";
import CampaignBuilderNav from "../../campaigns/CampaignBuilderNav";
import ConfigurationTabs from "./ConfigurationTabs";

export default async function CampaignGameConfigurationLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspaceId, role } = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data: game, error } = await supabase
    .from("campaign_games")
    .select("campaign_id,status,appearance,rules,games(name,type),campaigns!inner(name,workspace_id)")
    .eq("id", id)
    .eq("campaigns.workspace_id", workspaceId)
    .maybeSingle();
  if (error || !game) notFound();

  if (role === "viewer") {
    const campaign = Array.isArray(game.campaigns) ? game.campaigns[0] : game.campaigns;
    const definition = Array.isArray(game.games) ? game.games[0] : game.games;
    return <section className="admin-panel">
      <div className="eyebrow">READ-ONLY GAME DETAILS</div>
      <h1>{definition?.name ?? "Campaign game"}</h1>
      <p>{campaign?.name ?? "Campaign"} · {definition?.type ?? "Game"} · {game.status}</p>
      <h2>Appearance</h2>
      <pre style={{ overflowX: "auto", whiteSpace: "pre-wrap", padding: 16, background: "#f8fafc", borderRadius: 8 }}>{JSON.stringify(game.appearance ?? {}, null, 2)}</pre>
      <h2>Rules</h2>
      <pre style={{ overflowX: "auto", whiteSpace: "pre-wrap", padding: 16, background: "#f8fafc", borderRadius: 8 }}>{JSON.stringify(game.rules ?? {}, null, 2)}</pre>
    </section>;
  }

  return <>
    <CampaignBuilderNav campaignId={game.campaign_id} gameId={id} />
    <div className="campaign-game-configuration">
      <ConfigurationTabs />
      {children}
      <PrizeCouponSettings campaignGameId={id} />
      <AutoCouponSettings campaignGameId={id} />
      <CampaignPrizeColors campaignGameId={id} />
      <WheelCustomization campaignGameId={id} />
      <ScratchCustomization campaignGameId={id} />
      <PickACardCustomization campaignGameId={id} />
      <style>{`.campaign-game-configuration form > .admin-panel:first-child{display:none}`}</style>
    </div>
  </>;
}
