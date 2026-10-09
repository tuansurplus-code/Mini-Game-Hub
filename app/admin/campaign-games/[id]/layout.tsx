import type { ReactNode } from "react";
import CampaignPrizeColors from "./CampaignPrizeColors";
import WheelCustomization from "./WheelCustomization";
import ScratchCustomization from "./ScratchCustomization";
import PickACardCustomization from "./PickACardCustomization";
import PrizeCouponSettings from "./PrizeCouponSettings";
import AutoCouponSettings from "./AutoCouponSettings";
import {notFound} from "next/navigation";
import {requireAdmin} from "../../../../lib/admin-auth";
import {createSupabaseServerClient} from "../../../../lib/supabase-server";
import CampaignBuilderNav from "../../campaigns/CampaignBuilderNav";
import ConfigurationTabs from "./ConfigurationTabs";
export default async function CampaignGameConfigurationLayout({children,params}:{children:ReactNode;params:Promise<{id:string}>}){const{id}=await params;const {workspaceId}=await requireAdmin();const supabase=await createSupabaseServerClient();const {data:game,error}=await supabase.from("campaign_games").select("campaign_id,campaigns!inner(workspace_id)").eq("id",id).eq("campaigns.workspace_id",workspaceId).maybeSingle();if(error||!game)notFound();return <><CampaignBuilderNav campaignId={game.campaign_id} gameId={id}/><div className="campaign-game-configuration"><ConfigurationTabs/>{children}<PrizeCouponSettings campaignGameId={id}/><AutoCouponSettings campaignGameId={id}/><CampaignPrizeColors campaignGameId={id}/><WheelCustomization campaignGameId={id}/><ScratchCustomization campaignGameId={id}/><PickACardCustomization campaignGameId={id}/><style>{`.campaign-game-configuration form > .admin-panel:first-child{display:none}`}</style></div></>}
