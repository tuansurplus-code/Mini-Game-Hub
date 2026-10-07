"use client";

import { useEffect, useState } from "react";

type Prize = {
  id: string;
  name: string;
  active: boolean;
  metadata: Record<string, unknown> | null;
};

type CouponMode = "auto" | "fixed";

type Draft = {
  mode: CouponMode;
  fixedCode: string;
};

export default function PrizeCouponSettings({ campaignGameId }: { campaignGameId: string }) {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/campaign-games/${campaignGameId}/prizes`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load prizes.");
      const rows = (data.prizes ?? []) as Prize[];
      const winning = rows.filter((prize) => prize.metadata?.prize_type !== "no_prize");
      setPrizes(winning);
      const next: Record<string, Draft> = {};
      for (const prize of winning) {
        next[prize.id] = {
          mode: prize.metadata?.coupon_mode === "fixed" ? "fixed" : "auto",
          fixedCode: typeof prize.metadata?.fixed_coupon_code === "string" ? String(prize.metadata.fixed_coupon_code) : "",
        };
      }
      setDrafts(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load coupon settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [campaignGameId]);

  function update(id: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
    setMessage("");
    setError("");
  }

  async function save(prize: Prize) {
    const draft = drafts[prize.id];
    if (!draft) return;
    const fixedCode = draft.fixedCode.trim().toUpperCase();
    if (draft.mode === "fixed" && !fixedCode) {
      setError(`Enter a fixed coupon code for ${prize.name}.`);
      return;
    }
    if (fixedCode.length > 40) {
      setError("Fixed coupon code must be 40 characters or fewer.");
      return;
    }
    if (fixedCode && !/^[A-Z0-9_-]+$/.test(fixedCode)) {
      setError("Coupon code can use only letters, numbers, hyphens and underscores.");
      return;
    }

    setSavingId(prize.id);
    setMessage("");
    setError("");
    try {
      const fullResponse = await fetch(`/api/admin/campaign-games/${campaignGameId}/prizes`, { cache: "no-store" });
      const fullData = await fullResponse.json();
      if (!fullResponse.ok) throw new Error(fullData.error || "Failed to load prize.");
      const fullPrize = (fullData.prizes ?? []).find((p: { id: string }) => p.id === prize.id);
      if (!fullPrize) throw new Error("Prize not found.");

      const metadata = { ...(fullPrize.metadata ?? {}), coupon_mode: draft.mode } as Record<string, unknown>;
      if (draft.mode === "fixed") metadata.fixed_coupon_code = fixedCode;
      else delete metadata.fixed_coupon_code;

      const response = await fetch(`/api/admin/campaign-games/${campaignGameId}/prizes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prize_id: prize.id,
          name: fullPrize.name,
          description: fullPrize.description,
          image_url: fullPrize.image_url,
          weight: fullPrize.weight,
          inventory: fullPrize.inventory,
          active: fullPrize.active,
          metadata,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save coupon setting.");
      setDrafts((current) => ({ ...current, [prize.id]: { mode: draft.mode, fixedCode } }));
      setMessage(`${prize.name} coupon setting saved.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save coupon setting.");
    } finally {
      setSavingId(null);
    }
  }

  const box: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 20, marginTop: 20 };
  const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14 };

  return (
    <section style={box}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: "#64748b" }}>COUPON SETTINGS</div>
        <h2 style={{ margin: "5px 0 4px" }}>Prize Coupon Codes</h2>
        <p style={{ margin: 0, color: "#6b7280" }}>Choose whether each winning prize uses an automatically generated coupon or one fixed reusable code.</p>
      </div>

      {error && <div style={{ padding: 11, borderRadius: 10, background: "#fef2f2", color: "#b91c1c", marginBottom: 12 }}>{error}</div>}
      {message && <div style={{ padding: 11, borderRadius: 10, background: "#f0fdf4", color: "#166534", marginBottom: 12 }}>{message}</div>}
      {loading ? <p>Loading coupon settings...</p> : prizes.length === 0 ? <p style={{ color: "#6b7280" }}>Add a Winning Prize first. No Prize items do not generate coupons.</p> : (
        <div style={{ display: "grid", gap: 12 }}>
          {prizes.map((prize) => {
            const draft = drafts[prize.id] ?? { mode: "auto" as CouponMode, fixedCode: "" };
            return (
              <div key={prize.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}>
                  <strong>{prize.name}</strong><span style={{ fontSize: 12, color: prize.active ? "#166534" : "#6b7280" }}>{prize.active ? "Active" : "Inactive"}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, alignItems: "end" }}>
                  <label style={{ fontSize: 13, fontWeight: 700 }}>Coupon Type
                    <select value={draft.mode} onChange={(e) => update(prize.id, { mode: e.target.value as CouponMode })} style={{ ...input, marginTop: 6 }}>
                      <option value="auto">Auto Generate</option>
                      <option value="fixed">Fixed Code</option>
                    </select>
                  </label>
                  {draft.mode === "fixed" && <label style={{ fontSize: 13, fontWeight: 700 }}>Fixed Coupon Code
                    <input value={draft.fixedCode} onChange={(e) => update(prize.id, { fixedCode: e.target.value.toUpperCase() })} placeholder="TV10OFF" maxLength={40} style={{ ...input, marginTop: 6 }} />
                  </label>}
                  <button type="button" onClick={() => save(prize)} disabled={savingId === prize.id} style={{ border: 0, borderRadius: 10, padding: "11px 16px", background: "#111827", color: "#fff", fontWeight: 800, cursor: "pointer", opacity: savingId === prize.id ? .6 : 1 }}>
                    {savingId === prize.id ? "Saving..." : "Save Coupon Setting"}
                  </button>
                </div>
                <div style={{ marginTop: 9, fontSize: 12, color: "#6b7280" }}>{draft.mode === "fixed" ? "Every winner of this prize will receive the same code." : "This prize will use the campaign's automatic coupon-code format."}</div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
