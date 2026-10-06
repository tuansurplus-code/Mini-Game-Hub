import type { ReactNode } from "react";

export default function CampaignGameConfigurationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="campaign-game-configuration">
      {children}

      <style>{`
        .campaign-game-configuration form > .admin-panel:first-child {
          display: none;
        }
      `}</style>
    </div>
  );
}
