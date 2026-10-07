"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CampaignControlsProps = {
  campaignId: string;
  campaignName: string;
  status: string;
};

type CampaignAction = "activate" | "pause" | "resume" | "end";

export default function CampaignControls({ campaignId, campaignName, status }: CampaignControlsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<CampaignAction | null>(null);
  const [error, setError] = useState("");

  async function runAction(action: CampaignAction) {
    if (action === "end") {
      const confirmed = window.confirm(
        `End “${campaignName}”? Customers will no longer be able to play this campaign.`
      );
      if (!confirmed) return;
    }

    setLoading(action);
    setError("");

    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update campaign status.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update campaign status.");
    } finally {
      setLoading(null);
    }
  }

  const buttonStyle = { width: "100%", whiteSpace: "nowrap" as const, textAlign: "center" as const };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {(status === "draft" || status === "scheduled") && (
        <button type="button" className="primary-btn" style={buttonStyle} disabled={loading !== null} onClick={() => runAction("activate")}>
          {loading === "activate" ? "Activating..." : "Activate"}
        </button>
      )}

      {status === "active" && (
        <button type="button" className="secondary-btn" style={buttonStyle} disabled={loading !== null} onClick={() => runAction("pause")}>
          {loading === "pause" ? "Pausing..." : "Pause"}
        </button>
      )}

      {status === "paused" && (
        <button type="button" className="primary-btn" style={buttonStyle} disabled={loading !== null} onClick={() => runAction("resume")}>
          {loading === "resume" ? "Resuming..." : "Resume"}
        </button>
      )}

      {(status === "active" || status === "paused" || status === "scheduled") && (
        <button
          type="button"
          className="secondary-btn"
          style={{ ...buttonStyle, color: "#b91c1c" }}
          disabled={loading !== null}
          onClick={() => runAction("end")}
        >
          {loading === "end" ? "Ending..." : "End"}
        </button>
      )}

      {error && <div style={{ color: "#b91c1c", fontSize: "11px", lineHeight: 1.3 }}>{error}</div>}
    </div>
  );
}
