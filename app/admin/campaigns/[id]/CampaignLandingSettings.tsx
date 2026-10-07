"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type LandingSettings = {
  subtitle?: string;
  background_color?: string;
  card_background_color?: string;
  text_color?: string;
  button_color?: string;
  button_text_color?: string;
};

type Props = {
  campaignId: string;
  settings: LandingSettings;
};

export default function CampaignLandingSettings({ campaignId, settings }: Props) {
  const router = useRouter();
  const [subtitle, setSubtitle] = useState(settings.subtitle ?? "Choose a game and play for your chance to win exciting rewards.");
  const [backgroundColor, setBackgroundColor] = useState(settings.background_color ?? "#f4f6f8");
  const [cardBackgroundColor, setCardBackgroundColor] = useState(settings.card_background_color ?? "#ffffff");
  const [textColor, setTextColor] = useState(settings.text_color ?? "#111827");
  const [buttonColor, setButtonColor] = useState(settings.button_color ?? "#e31b23");
  const [buttonTextColor, setButtonTextColor] = useState(settings.button_text_color ?? "#ffffff");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}/landing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtitle: subtitle.trim(),
          background_color: backgroundColor,
          card_background_color: cardBackgroundColor,
          text_color: textColor,
          button_color: buttonColor,
          button_text_color: buttonTextColor,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Failed to save landing page settings.");
        setSaving(false);
        return;
      }
      setMessage("Landing page settings saved.");
      setSaving(false);
      router.refresh();
    } catch {
      setError("Unable to save landing page settings.");
      setSaving(false);
    }
  }

  const colorField = (label: string, value: string, setter: (value: string) => void) => (
    <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600 }}>
      {label}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="color" value={value} onChange={(e) => setter(e.target.value)} disabled={saving} style={{ width: 44, height: 38, padding: 2 }} />
        <input type="text" value={value} onChange={(e) => setter(e.target.value)} disabled={saving} style={{ width: "100%", padding: "9px 10px", border: "1px solid #ddd", borderRadius: 8 }} />
      </div>
    </label>
  );

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 18 }}>
      <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600 }}>
        Campaign Subtitle
        <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} disabled={saving} maxLength={180} style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 }} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginTop: 16 }}>
        {colorField("Page Background", backgroundColor, setBackgroundColor)}
        {colorField("Game Card Background", cardBackgroundColor, setCardBackgroundColor)}
        {colorField("Main Text", textColor, setTextColor)}
        {colorField("Play Button", buttonColor, setButtonColor)}
        {colorField("Button Text", buttonTextColor, setButtonTextColor)}
      </div>

      {error && <div style={{ marginTop: 12, color: "#b91c1c", fontSize: 13 }}>{error}</div>}
      {message && <div style={{ marginTop: 12, color: "#166534", fontSize: 13 }}>{message}</div>}

      <button type="submit" disabled={saving} className="primary-btn" style={{ marginTop: 18 }}>
        {saving ? "Saving..." : "Save Landing Page"}
      </button>
    </form>
  );
}
