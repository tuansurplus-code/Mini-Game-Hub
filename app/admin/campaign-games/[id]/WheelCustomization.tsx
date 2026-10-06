"use client";

import { useEffect, useMemo, useState } from "react";

type Prize = {
  id: string;
  name: string;
  weight: number;
  active: boolean;
  metadata: Record<string, unknown> | null;
};

type Settings = {
  wheel_style: string;
  wheel_theme: string;
  segment_sizing: "equal" | "weight";
  min_visual_segments: number;
  wheel_border_color: string;
  wheel_border_thickness: number;
  center_color: string;
  center_size: number;
  pointer_color: string;
  prize_text_color: string;
  prize_text_size: number;
  text_orientation: string;
  animation_duration: number;
};

const defaults: Settings = {
  wheel_style: "classic",
  wheel_theme: "multicolor",
  segment_sizing: "equal",
  min_visual_segments: 8,
  wheel_border_color: "#111827",
  wheel_border_thickness: 8,
  center_color: "#e31b23",
  center_size: 50,
  pointer_color: "#e31b23",
  prize_text_color: "#ffffff",
  prize_text_size: 13,
  text_orientation: "auto",
  animation_duration: 5.2,
};

const palettes: Record<string, string[]> = {
  "red-white": ["#dc2626", "#ffffff"],
  gold: ["#d4a017", "#fff7d6", "#7c5b00"],
  blue: ["#2563eb", "#60a5fa", "#1e3a8a"],
  green: ["#16a34a", "#86efac", "#14532d"],
  multicolor: ["#e31b23", "#111827", "#f59e0b", "#2563eb", "#16a34a", "#7c3aed", "#db2777", "#0891b2"],
  custom: ["#e31b23", "#111827", "#f59e0b", "#2563eb"],
};

const isHex = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);

const numberValue = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === "number" ? Math.min(max, Math.max(min, value)) : fallback;

function parseSettings(appearance: Record<string, unknown>): Settings {
  return {
    wheel_style: typeof appearance.wheel_style === "string" ? appearance.wheel_style : defaults.wheel_style,
    wheel_theme: typeof appearance.wheel_theme === "string" ? appearance.wheel_theme : defaults.wheel_theme,
    segment_sizing: appearance.segment_sizing === "weight" ? "weight" : "equal",
    min_visual_segments: numberValue(appearance.min_visual_segments, defaults.min_visual_segments, 0, 24),
    wheel_border_color: isHex(appearance.wheel_border_color) ? appearance.wheel_border_color : defaults.wheel_border_color,
    wheel_border_thickness: numberValue(appearance.wheel_border_thickness, defaults.wheel_border_thickness, 0, 24),
    center_color: isHex(appearance.center_color) ? appearance.center_color : defaults.center_color,
    center_size: numberValue(appearance.center_size, defaults.center_size, 24, 120),
    pointer_color: isHex(appearance.pointer_color) ? appearance.pointer_color : defaults.pointer_color,
    prize_text_color: isHex(appearance.prize_text_color) ? appearance.prize_text_color : defaults.prize_text_color,
    prize_text_size: numberValue(appearance.prize_text_size, defaults.prize_text_size, 9, 24),
    text_orientation: typeof appearance.text_orientation === "string" ? appearance.text_orientation : defaults.text_orientation,
    animation_duration: numberValue(appearance.animation_duration, defaults.animation_duration, 2, 10),
  };
}

export default function WheelCustomization({ campaignGameId }: { campaignGameId: string }) {
  const [base, setBase] = useState<Record<string, unknown>>({});
  const [settings, setSettings] = useState<Settings>(defaults);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/campaign-games/${campaignGameId}`, { cache: "no-store" }).then((response) => response.json()),
      fetch(`/api/admin/campaign-games/${campaignGameId}/prizes`, { cache: "no-store" }).then((response) => response.json()),
    ])
      .then(([configuration, prizeResult]) => {
        const appearance = (configuration.campaignGame?.appearance || {}) as Record<string, unknown>;
        setBase(appearance);
        setSettings(parseSettings(appearance));
        setPrizes(Array.isArray(prizeResult.prizes) ? prizeResult.prizes : []);
      })
      .catch(() => setMessage("Unable to load wheel customization."));
  }, [campaignGameId]);

  const segments = useMemo(() => {
    const activePrizes = prizes.filter((prize) => prize.active);
    if (!activePrizes.length) return [];

    const targetCount = Math.max(activePrizes.length, settings.min_visual_segments || activePrizes.length);
    const copies = Math.max(1, Math.ceil(targetCount / activePrizes.length));
    const entries = Array.from({ length: activePrizes.length * copies }, (_, index) => ({
      prize: activePrizes[index % activePrizes.length],
      prizeIndex: index % activePrizes.length,
      copy: Math.floor(index / activePrizes.length),
    }));

    const counts = new Map<string, number>();
    entries.forEach(({ prize }) => counts.set(prize.id, (counts.get(prize.id) || 0) + 1));

    const units = entries.map(({ prize }) =>
      settings.segment_sizing === "weight"
        ? Math.max(0, prize.weight) / (counts.get(prize.id) || 1)
        : 1
    );
    const total = units.reduce((sum, value) => sum + value, 0) || entries.length;
    let current = 0;

    return entries.map((entry, index) => {
      const size = (units[index] || 1) * 360 / total;
      const start = current;
      const end = index === entries.length - 1 ? 360 : current + size;
      current = end;
      const prizeColor = entry.prize.metadata?.segment_color;
      const palette = palettes[settings.wheel_theme] || palettes.multicolor;
      return {
        ...entry,
        start,
        end,
        center: start + (end - start) / 2,
        color: isHex(prizeColor) ? prizeColor : palette[entry.prizeIndex % palette.length],
      };
    });
  }, [prizes, settings]);

  const wheelBackground = segments.length
    ? `conic-gradient(${segments.map((segment) => `${segment.color} ${segment.start}deg ${segment.end}deg`).join(",")})`
    : "#e5e7eb";

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/campaign-games/${campaignGameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appearance: { ...base, ...settings } }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Save failed.");
      const appearance = (result.campaignGame?.appearance || { ...base, ...settings }) as Record<string, unknown>;
      setBase(appearance);
      setSettings(parseSettings(appearance));
      setMessage("Wheel customization saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "10px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    boxSizing: "border-box" as const,
    background: "#ffffff",
  };

  const colorField = (
    label: string,
    key: "wheel_border_color" | "center_color" | "pointer_color" | "prize_text_color"
  ) => (
    <div>
      <b>{label}</b>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <input type="color" value={settings[key]} onChange={(event) => update(key, event.target.value)} style={{ width: 48, height: 40 }} />
        <input value={settings[key]} readOnly style={inputStyle} />
      </div>
    </div>
  );

  return (
    <section className="admin-panel" style={{ marginTop: 20 }}>
      <div className="eyebrow">APPEARANCE</div>
      <h2 style={{ margin: "4px 0 6px" }}>Wheel Customization</h2>
      <p style={{ margin: "0 0 20px", color: "#6b7280" }}>
        Customize the campaign wheel. Visual segment sizing does not change backend winning probability.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 16 }}>
        <div>
          <b>Quick Theme</b>
          <select value={settings.wheel_theme} onChange={(event) => update("wheel_theme", event.target.value)} style={{ ...inputStyle, marginTop: 6 }}>
            <option value="red-white">Red &amp; White</option>
            <option value="gold">Gold</option>
            <option value="blue">Blue</option>
            <option value="green">Green</option>
            <option value="multicolor">Multicolor</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div>
          <b>Wheel Style</b>
          <select value={settings.wheel_style} onChange={(event) => update("wheel_style", event.target.value)} style={{ ...inputStyle, marginTop: 6 }}>
            <option value="classic">Classic</option>
            <option value="modern">Modern</option>
            <option value="bold">Bold</option>
            <option value="elegant">Elegant</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div>
          <b>Segment Sizing</b>
          <select value={settings.segment_sizing} onChange={(event) => update("segment_sizing", event.target.value as Settings["segment_sizing"])} style={{ ...inputStyle, marginTop: 6 }}>
            <option value="equal">Equal Size</option>
            <option value="weight">Based on Prize Weight</option>
          </select>
        </div>
        <div>
          <b>Minimum Visual Segments</b>
          <select value={settings.min_visual_segments} onChange={(event) => update("min_visual_segments", Number(event.target.value))} style={{ ...inputStyle, marginTop: 6 }}>
            <option value={0}>Auto</option>
            <option value={4}>4</option>
            <option value={6}>6</option>
            <option value={8}>8</option>
            <option value={10}>10</option>
            <option value={12}>12</option>
          </select>
          <small style={{ color: "#6b7280" }}>4 prizes + 8 segments = each prize appears twice visually.</small>
        </div>
        {colorField("Wheel Border Color", "wheel_border_color")}
        {colorField("Center Circle Color", "center_color")}
        {colorField("Pointer Color", "pointer_color")}
        {colorField("Prize Text Color", "prize_text_color")}
        <div><b>Border Thickness ({settings.wheel_border_thickness}px)</b><input type="range" min={0} max={24} value={settings.wheel_border_thickness} onChange={(event) => update("wheel_border_thickness", Number(event.target.value))} style={{ width: "100%" }} /></div>
        <div><b>Center Size ({settings.center_size}px)</b><input type="range" min={24} max={120} value={settings.center_size} onChange={(event) => update("center_size", Number(event.target.value))} style={{ width: "100%" }} /></div>
        <div><b>Prize Text Size ({settings.prize_text_size}px)</b><input type="range" min={9} max={24} value={settings.prize_text_size} onChange={(event) => update("prize_text_size", Number(event.target.value))} style={{ width: "100%" }} /></div>
        <div>
          <b>Text Orientation</b>
          <select value={settings.text_orientation} onChange={(event) => update("text_orientation", event.target.value)} style={{ ...inputStyle, marginTop: 6 }}>
            <option value="auto">Auto</option><option value="radial">Radial</option><option value="tangential">Tangential</option><option value="horizontal">Horizontal</option>
          </select>
        </div>
        <div><b>Spin Duration ({settings.animation_duration.toFixed(1)}s)</b><input type="range" min={2} max={10} step={0.2} value={settings.animation_duration} onChange={(event) => update("animation_duration", Number(event.target.value))} style={{ width: "100%" }} /></div>
      </div>

      <div style={{ marginTop: 24, padding: 20, border: "1px solid #e5e7eb", borderRadius: 12, background: "#f9fafb", textAlign: "center" }}>
        <b>Live Wheel Preview</b>
        <div style={{ position: "relative", width: 300, height: 300, maxWidth: "75vw", maxHeight: "75vw", margin: "16px auto 0" }}>
          <div style={{ position: "absolute", top: -3, left: "50%", transform: "translateX(-50%)", zIndex: 9, width: 0, height: 0, borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderTop: `27px solid ${settings.pointer_color}` }} />
          <div style={{ width: "100%", height: "100%", boxSizing: "border-box", borderRadius: "50%", padding: settings.wheel_border_thickness, background: settings.wheel_border_color }}>
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: wheelBackground, position: "relative", overflow: "hidden", border: "3px solid #fff", boxSizing: "border-box" }}>
              {segments.map((segment) => {
                const radial = segment.center - 90;
                const flip = radial > 90 || radial < -90;
                const outer = settings.text_orientation === "tangential" ? `translateY(-50%) rotate(${segment.center}deg)` : `translateY(-50%) rotate(${radial}deg)`;
                const inner = settings.text_orientation === "horizontal" ? `rotate(${-radial}deg)` : flip && settings.text_orientation !== "tangential" ? "rotate(180deg)" : "none";
                return (
                  <div key={`${segment.prize.id}-${segment.copy}`} style={{ position: "absolute", top: "50%", left: "50%", width: "32%", height: 30, transform: outer, transformOrigin: "0 50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ width: "100%", color: settings.prize_text_color, fontSize: settings.prize_text_size, fontWeight: 900, textAlign: "center", lineHeight: 1, overflowWrap: "anywhere", textShadow: "0 1px 3px #000", transform: inner }}>{segment.prize.name}</span>
                  </div>
                );
              })}
              <div style={{ position: "absolute", top: "50%", left: "50%", width: settings.center_size, height: settings.center_size, transform: "translate(-50%,-50%)", borderRadius: "50%", background: settings.center_color, border: "4px solid #fff", zIndex: 5 }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 16 }}>
        {message && <span style={{ fontSize: 13, color: message.includes("saved") ? "#065f46" : "#b91c1c" }}>{message}</span>}
        <button type="button" className="primary-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Wheel Customization"}</button>
      </div>
    </section>
  );
}
