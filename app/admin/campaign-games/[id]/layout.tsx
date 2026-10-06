import type { ReactNode } from "react";
import CampaignPrizeColors from "./CampaignPrizeColors";

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
      <CampaignPrizeColors campaignGameId={id} />

      <style>{`
        .campaign-game-configuration form > .admin-panel:first-child {
          display: none;
        }
      `}</style>
    </div>
  );
}
