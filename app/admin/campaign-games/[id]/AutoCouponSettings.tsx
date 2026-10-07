"use client";

import { useEffect, useMemo, useState } from "react";

type CharacterType = "alphanumeric" | "numbers" | "letters";
type Separator = "-" | "";

type CouponFormat = {
  prefix: string;
  random_length: number;
  character_type: CharacterType;
  separator: Separator;
};

const defaults: CouponFormat = {
  prefix: "SG",
  random_length: 8,
  character_type: "alphanumeric",
  separator: "-",
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readFormat(rules: Record<string, unknown>): CouponFormat {
  const raw = isObject(rules.coupon_code) ? rules.coupon_code : {};
  const prefix = typeof raw.prefix === "string" ? raw.prefix : defaults.prefix;
  const randomLength = typeof raw.random_length === "number" && Number.isInteger(raw.random_length)
    ? raw.random_length
    : defaults.random_length;
  const characterType: CharacterType = raw.character_type === "numbers" || raw.character_type === "letters"
    ? raw.character_type
    : "alphanumeric";
  const separator: Separator = raw.separator === "" ? "" : "-";
  return { prefix, random_length: randomLength, character_type: characterType, separator };
}

export default function AutoCouponSettings({ campaignGameId }: { campaignGameId: string }) {
  const [format, setFormat] = useState<CouponFormat>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/campaign-games/${campaignGameId}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load coupon format.");
      setFormat(readFormat(data.campaignGame?.rules ?? {}));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load coupon format.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [campaignGameId]);

  const preview = useMemo(() => {
    const chars = format.character_type === "numbers"
      ? "48273195"
      : format.character_type === "letters"
        ? "AZKQWMNP"
        : "A7F3C6B2";
    const random = chars.repeat(Math.ceil(format.random_length / chars.length)).slice(0, format.random_length);
    return `${format.prefix}${format.prefix && random ? format.separator : ""}${random}`;
  }, [format]);

  function update(patch: Partial<CouponFormat>) {
    setFormat((current) => ({ ...current, ...patch }));
    setError("");
    setMessage("");
  }

  async function save() {
    const prefix = format.prefix.trim().toUpperCase();
    if (prefix.length > 20) return setError("Prefix must be 20 characters or fewer.");
    if (prefix && !/^[A-Z0-9]+$/.test(prefix)) return setError("Prefix can use only letters and numbers.");
    if (!Number.isInteger(format.random_length) || format.random_length < 4 || format.random_length > 20) {
      return setError("Random code length must be between 4 and 20 characters.");
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const currentResponse = await fetch(`/api/admin/campaign-games/${campaignGameId}`, { cache: "no-store" });
      const currentData = await currentResponse.json();
      if (!currentResponse.ok) throw new Error(currentData.error || "Failed to load current settings.");
      const currentRules = isObject(currentData.campaignGame?.rules) ? currentData.campaignGame.rules : {};
      const couponCode = {
        prefix,
        random_length: format.random_length,
        character_type: format.character_type,
        separator: format.separator,
      };
      const response = await fetch(`/api/admin/campaign-games/${campaignGameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: { ...currentRules, coupon_code: couponCode } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save coupon format.");
      setFormat(couponCode);
      setMessage("Automatic coupon format saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save coupon format.");
    } finally {
      setSaving(false);
    }
  }

  const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, marginTop: 6 };

  return (
    <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 20, marginTop: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: "#64748b" }}>COUPON SETTINGS</div>
      <h2 style={{ margin: "5px 0 4px" }}>Auto Generate Coupon Format</h2>
      <p style={{ margin: "0 0 16px", color: "#6b7280" }}>Used by all winning prizes set to Auto Generate. Fixed Code prizes ignore these settings.</p>

      {error && <div style={{ padding: 11, borderRadius: 10, background: "#fef2f2", color: "#b91c1c", marginBottom: 12 }}>{error}</div>}
      {message && <div style={{ padding: 11, borderRadius: 10, background: "#f0fdf4", color: "#166534", marginBottom: 12 }}>{message}</div>}

      {loading ? <p>Loading automatic coupon settings...</p> : <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 700 }}>Prefix
            <input value={format.prefix} onChange={(e) => update({ prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} placeholder="SGWIN" maxLength={20} style={input} />
          </label>
          <label style={{ fontSize: 13, fontWeight: 700 }}>Random Code Length
            <input type="number" min={4} max={20} value={format.random_length} onChange={(e) => update({ random_length: Number(e.target.value) })} style={input} />
          </label>
          <label style={{ fontSize: 13, fontWeight: 700 }}>Character Type
            <select value={format.character_type} onChange={(e) => update({ character_type: e.target.value as CharacterType })} style={input}>
              <option value="alphanumeric">Letters + Numbers</option>
              <option value="numbers">Numbers Only</option>
              <option value="letters">Letters Only</option>
            </select>
          </label>
          <label style={{ fontSize: 13, fontWeight: 700 }}>Separator
            <select value={format.separator} onChange={(e) => update({ separator: e.target.value as Separator })} style={input}>
              <option value="-">Hyphen (-)</option>
              <option value="">None</option>
            </select>
          </label>
        </div>

        <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", marginBottom: 5 }}>PREVIEW</div>
          <code style={{ fontSize: 18, fontWeight: 800 }}>{preview || "A7F3C6B2"}</code>
        </div>

        <button type="button" onClick={save} disabled={saving} style={{ marginTop: 16, border: 0, borderRadius: 10, padding: "11px 18px", background: "#111827", color: "#fff", fontWeight: 800, cursor: "pointer", opacity: saving ? .6 : 1 }}>
          {saving ? "Saving..." : "Save Auto Coupon Format"}
        </button>
      </>}
    </section>
  );
}
