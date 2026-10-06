"use client";

import { useEffect, useState } from "react";

type Prize = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  weight: number;
  inventory: number | null;
  active: boolean;
  metadata: Record<string, unknown>;
};

export default function CampaignPrizeColors({ campaignGameId }: { campaignGameId: string }) {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/admin/campaign-games/${campaignGameId}/prizes`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to load prize colors.");
        setPrizes(Array.isArray(result.prizes) ? result.prizes : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load prize colors.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [campaignGameId]);

  function colorOf(prize: Prize) {
    return typeof prize.metadata?.segment_color === "string" ? prize.metadata.segment_color : "#e31b23";
  }

  async function saveColor(prize: Prize, color: string) {
    setSavingId(prize.id);
    setError("");
    setSuccess("");

    const metadata = { ...prize.metadata, segment_color: color };
    setPrizes((current) => current.map((item) => item.id === prize.id ? { ...item, metadata } : item));

    try {
      const response = await fetch(`/api/admin/campaign-games/${campaignGameId}/prizes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prize_id: prize.id,
          name: prize.name,
          description: prize.description,
          image_url: prize.image_url,
          weight: prize.weight,
          inventory: prize.inventory,
          active: prize.active,
          metadata,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save prize color.");
      setPrizes((current) => current.map((item) => item.id === prize.id ? result.prize : item));
      setSuccess(`${prize.name} color updated.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save prize color.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="admin-panel" style={{ marginTop: "20px", marginBottom: "30px" }}>
      <div style={{ marginBottom: "18px" }}>
        <div className="eyebrow">WHEEL COLORS</div>
        <h2 style={{ margin: "4px 0 6px" }}>Prize Wheel Colors</h2>
        <p style={{ margin: 0, color: "#6b7280" }}>
          Set the wheel segment color for each prize in this campaign game. These are the same colors available in Admin / Prizes.
        </p>
      </div>

      {error && <div className="error-box" style={{ marginBottom: "14px" }}>{error}</div>}
      {success && <div style={{ marginBottom: "14px", padding: "10px 12px", borderRadius: "8px", background: "#ecfdf5", color: "#065f46" }}>{success}</div>}

      {loading ? <div className="empty">Loading prize colors...</div> : prizes.length === 0 ? <div className="empty">No prizes available.</div> : (
        <div style={{ display: "grid", gap: "10px" }}>
          {prizes.map((prize) => {
            const color = colorOf(prize);
            return (
              <div key={prize.id} style={{ display: "grid", gridTemplateColumns: "minmax(180px,1fr) auto", gap: "16px", alignItems: "center", padding: "14px 16px", border: "1px solid #e5e7eb", borderRadius: "10px", background: "#fff" }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{prize.name}</div>
                  <div style={{ marginTop: "4px", fontSize: "12px", color: "#6b7280" }}>{prize.active ? "Active" : "Inactive"}</div>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="color"
                    value={color}
                    disabled={savingId === prize.id}
                    onChange={(event) => saveColor(prize, event.target.value)}
                    aria-label={`${prize.name} wheel segment color`}
                    style={{ width: "52px", height: "42px", padding: "2px", border: "1px solid #d1d5db", borderRadius: "8px" }}
                  />
                  <span style={{ width: "76px", fontSize: "13px", fontFamily: "monospace" }}>{color}</span>
                  {savingId === prize.id && <span style={{ fontSize: "12px", color: "#6b7280" }}>Saving...</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
