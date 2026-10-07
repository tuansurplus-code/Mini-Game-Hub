import type { ReactNode } from "react";
import CampaignPrizeColors from "./CampaignPrizeColors";
import WheelCustomization from "./WheelCustomization";
import ScratchCustomization from "./ScratchCustomization";
import PrizeCouponSettings from "./PrizeCouponSettings";

export default async function CampaignGameConfigurationLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="campaign-game-configuration">
      {children}
      <PrizeCouponSettings campaignGameId={id} />
      <CampaignPrizeColors campaignGameId={id} />
      <WheelCustomization campaignGameId={id} />
      <ScratchCustomization campaignGameId={id} />

      <style>{`
        .campaign-game-configuration form > .admin-panel:first-child {
          display: none;
        }
      `}</style>
    </div>
  );
}
