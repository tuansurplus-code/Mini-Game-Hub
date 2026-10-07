"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { campaignId: string; campaignName: string };

export default function DuplicateCampaignButton({ campaignId, campaignName }: Props) {
  const router = useRouter();
  const [duplicating, setDuplicating] = useState(false);

  async function handleDuplicate() {
    if (duplicating) return;
    const confirmed = window.confirm(`Duplicate "${campaignName}"?\n\nThe new campaign will be created as a Draft with the same game configuration, appearance, rules and prizes. Participants, spins, winners and coupons will not be copied.`);
    if (!confirmed) return;
    setDuplicating(true);
    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}/duplicate`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) {
        window.alert(result.error || "Failed to duplicate campaign.");
        setDuplicating(false);
        return;
      }
      if (!result.campaign?.id) {
        window.alert("Campaign was duplicated, but the new campaign could not be opened.");
        setDuplicating(false);
        router.refresh();
        return;
      }
      router.push(`/admin/campaigns/${result.campaign.id}`);
      router.refresh();
    } catch {
      window.alert("Unable to duplicate campaign.");
      setDuplicating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDuplicate}
      disabled={duplicating}
      className="secondary-btn"
      style={{
        whiteSpace: "nowrap",
        cursor: duplicating ? "not-allowed" : "pointer",
        opacity: duplicating ? 0.65 : 1,
      }}
    >
      {duplicating ? "Duplicating..." : "Duplicate"}
    </button>
  );
}
