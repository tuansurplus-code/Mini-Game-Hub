"use client";

import { useEffect, useState } from "react";

type Category = "text" | "colors" | "styles" | "advanced";
type PlanPermission = {
  plan_id: string; plan_name: string; plan_slug: string; plan_active: boolean;
  enabled: boolean; allowed_customizations: Category[];
};
type Template = {
  game_type: "spin" | "scratch" | "pick-card"; name: string; description: string; active: boolean;
  feature_flags: Record<Category, boolean>; default_appearance: Record<string, string | number>;
  updated_at?: string; plan_permissions: PlanPermission[];
};
type Props = { canEdit: boolean };
const categories: { key: Category; label: string; help: string }[] = [
  { key: "text", label: "Text", help: "Titles, subtitles, and instructions" },
  { key: "colors", label: "Colors", help: "Game and card colors" },
  { key: "styles", label: "Game styles", help: "Themes, presets, and card styles" },
  { key: "advanced", label: "Advanced controls", help: "Sizes, counts, and animation settings" },
];
const appearanceKeys: Record<Template["game_type"], string[]> = {
  spin: ["title","subtitle","button_text","page_background_color","button_color","button_text_color","wheel_style","wheel_theme","segment_sizing","min_visual_segments","wheel_border_color","wheel_border_thickness","center_color","center_size","pointer_color","prize_text_color","prize_text_size","text_orientation","animation_duration"],
  scratch: ["title","subtitle","button_text","page_background_color","button_color","button_text_color","scratch_style","scratch_cover_color","scratch_cover_alt_color","scratch_card_background","scratch_card_border_color","scratch_card_border_thickness","scratch_card_radius","scratch_instruction","scratch_reveal_percent"],
  "pick-card": ["title","subtitle","button_text","page_background_color","button_color","button_text_color","card_theme","card_style","card_back_color","card_back_alt_color","card_front_color","card_border_color","card_radius","card_count","reveal_duration"],
};
const gameIcons: Record<Template["game_type"], string> = { spin: "↻", scratch: "▧", "pick-card": "▣" };
function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}
function fresh(template: Template): Template {
  return { ...template, feature_flags: { ...template.feature_flags }, default_appearance: { ...template.default_appearance }, plan_permissions: template.plan_permissions.map(item => ({ ...item, allowed_customizations: [...item.allowed_customizations] })) };
}
function colorField(key: string) {
  return key.includes("color") || key.includes("background");
}
function formatValue(value: string | number) {
  return typeof value === "number" ? String(value) : value;
}

export default function GameTemplateManager({ canEdit }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [draft, setDraft] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/saas-admin/templates", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load game templates.");
      setTemplates(result.templates ?? []);
      setDraft(current => {
        const latest = (result.templates ?? []).find((item: Template) => item.game_type === current?.game_type);
        return latest ? fresh(latest) : null;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load game templates.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  const selected = useMemo(() => draft ? templates.find(item => item.game_type === draft.game_type) : null, [draft, templates]);
  function update(patch: Partial<Template>) {
    setDraft(current => current ? { ...current, ...patch } : null);
  }
  function updateFeature(key: Category, value: boolean) {
    setDraft(current => current ? { ...current, feature_flags: { ...current.feature_flags, [key]: value } } : null);
  }
  function updateAppearance(key: string, value: string | number) {
    setDraft(current => current ? { ...current, default_appearance: { ...current.default_appearance, [key]: value } } : null);
  }
  function updatePlan(planId: string, patch: Partial<PlanPermission>) {
    setDraft(current => current ? {
      ...current,
      plan_permissions: current.plan_permissions.map(item => item.plan_id === planId ? { ...item, ...patch } : item),
    } : null);
  }
  function togglePlanCategory(plan: PlanPermission, key: Category) {
    const next = plan.allowed_customizations.includes(key)
      ? plan.allowed_customizations.filter(item => item !== key)
      : [...plan.allowed_customizations, key];
    updatePlan(plan.plan_id, { allowed_customizations: next });
  }
  async function save() {
    if (!draft) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/saas-admin/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save game settings.");
      setMessage(draft.name + " settings saved.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save game settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="admin-panel">Loading game templates…</div>;
  const planCount = (template: Template) => template.plan_permissions.filter(item => item.enabled && item.plan_active).length;
  return (
    <div style={{ display: "grid", gap: 18 }}>
      {error && <div role="alert" className="admin-panel" style={{ color: "var(--admin-danger, #b91c1c)" }}>{error}</div>}
      {message && <div role="status" className="admin-panel" style={{ color: "var(--admin-success, #166534)" }}>{message}</div>}
      {!canEdit && <div className="admin-panel">Your platform role can view game settings but cannot change them.</div>}

      <section className="admin-panel" style={{ margin: 0, padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
            <thead><tr style={{ textAlign: "left", borderBottom: "1px solid var(--admin-border, #e5e7eb)" }}>
              <th style={{ padding: "13px 16px" }}>Game</th>
              <th style={{ padding: "13px 16px" }}>Platform availability</th>
              <th style={{ padding: "13px 16px" }}>Plans enabled</th>
              <th style={{ padding: "13px 16px" }}> </th>
            </tr></thead>
            <tbody>
              {templates.map(template => <tr key={template.game_type} style={{ borderBottom: "1px solid var(--admin-border, #e5e7eb)" }}>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--admin-muted, #f3f4f6)", fontSize: 21 }}>{gameIcons[template.game_type]}</span>
                    <div><strong>{template.name}</strong><div style={{ color: "var(--admin-muted-text, #6b7280)", fontSize: 12 }}>{template.description}</div></div>
                  </div>
                </td>
                <td style={{ padding: "14px 16px" }}><span style={{ fontWeight: 700, color: template.active ? "#15803d" : "#b91c1c" }}>{template.active ? "Enabled" : "Disabled"}</span></td>
                <td style={{ padding: "14px 16px" }}>{planCount(template)} of {template.plan_permissions.length}</td>
                <td style={{ padding: "14px 16px", textAlign: "right" }}>
                  <button className="secondary-btn" type="button" onClick={() => { setDraft(fresh(template)); setError(""); setMessage(""); }}>Configure</button>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>

      {draft && <section className="admin-panel" style={{ margin: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, flexWrap: "wrap" }}>
          <div><div className="eyebrow">GAME TEMPLATE · {draft.game_type.toUpperCase()}</div><h2 style={{ margin: "5px 0" }}>{draft.name}</h2><p style={{ margin: 0, color: "var(--admin-muted-text, #6b7280)" }}>Changes to defaults apply to new campaigns. Existing campaign settings stay as saved.</p></div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
            <input type="checkbox" checked={draft.active} disabled={!canEdit || saving} onChange={event => update({ active: event.target.checked })} />
            {draft.active ? "Enabled platform-wide" : "Disabled platform-wide"}
          </label>
        </div>

        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 6 }}>Platform features</h3>
          <p style={{ marginTop: 0, color: "var(--admin-muted-text, #6b7280)" }}>Turn off a feature for all workspaces. Saved campaigns keep their current settings.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
            {categories.map(category => <label key={category.key} style={{ display: "flex", gap: 10, alignItems: "start", padding: 12, border: "1px solid var(--admin-border, #e5e7eb)", borderRadius: 10, opacity: draft.feature_flags[category.key] ? 1 : 0.7 }}>
              <input type="checkbox" checked={Boolean(draft.feature_flags[category.key])} disabled={!canEdit || saving} onChange={event => updateFeature(category.key, event.target.checked)} />
              <span><strong>{category.label}</strong><small style={{ display: "block", color: "var(--admin-muted-text, #6b7280)" }}>{category.help}</small></span>
            </label>)}
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 6 }}>Default appearance</h3>
          <p style={{ marginTop: 0, color: "var(--admin-muted-text, #6b7280)" }}>These values are copied into each new campaign using this game.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
            {appearanceKeys[draft.game_type].map(key => {
              const value = draft.default_appearance[key] ?? "";
              const color = typeof value === "string" && colorField(key);
              return <label key={key} style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600 }}>
                {humanize(key)}
                {typeof value === "number"
                  ? <input type="number" value={formatValue(value)} disabled={!canEdit || saving} onChange={event => updateAppearance(key, Number(event.target.value))} style={{ padding: 10, border: "1px solid var(--admin-border, #d1d5db)", borderRadius: 8, width: "100%", boxSizing: "border-box" }} />
                  : color
                    ? <div style={{ display: "flex", gap: 8, alignItems: "center" }}><input aria-label={humanize(key) + " color"} type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff"} disabled={!canEdit || saving} onChange={event => updateAppearance(key, event.target.value)} style={{ width: 48, height: 40 }} /><input readOnly value={formatValue(value)} style={{ width: "100%", padding: 10, border: "1px solid var(--admin-border, #d1d5db)", borderRadius: 8, boxSizing: "border-box" }} /></div>
                    : <input type="text" maxLength={160} value={formatValue(value)} disabled={!canEdit || saving} onChange={event => updateAppearance(key, event.target.value)} style={{ padding: 10, border: "1px solid var(--admin-border, #d1d5db)", borderRadius: 8, width: "100%", boxSizing: "border-box" }} />}
              </label>;
            })}
          </div>
          <div aria-label="Default appearance preview" style={{ marginTop: 16, padding: 20, borderRadius: 12, background: String(draft.default_appearance.page_background_color || "#f8fafc"), border: "1px solid var(--admin-border, #e5e7eb)", textAlign: "center" }}>
            <strong style={{ display: "block", marginBottom: 5 }}>{String(draft.default_appearance.title || draft.name)}</strong>
            <span style={{ display: "block", marginBottom: 14, color: "var(--admin-muted-text, #6b7280)" }}>{String(draft.default_appearance.subtitle || "Game subtitle preview")}</span>
            <span style={{ display: "inline-block", padding: "9px 16px", borderRadius: 999, background: String(draft.default_appearance.button_color || "#e31b23"), color: String(draft.default_appearance.button_text_color || "#ffffff"), fontWeight: 700 }}>{String(draft.default_appearance.button_text || "Play")}</span>
          </div>
        </div>

        <div style={{ marginTop: 26 }}>
          <h3 style={{ marginBottom: 6 }}>Plan access and customizations</h3>
          <p style={{ marginTop: 0, color: "var(--admin-muted-text, #6b7280)" }}>Choose whether each plan includes this game and which settings its workspace admins can customize.</p>
          <div style={{ overflowX: "auto", border: "1px solid var(--admin-border, #e5e7eb)", borderRadius: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 880 }}>
              <thead><tr style={{ textAlign: "left", background: "var(--admin-muted, #f9fafb)" }}>
                <th style={{ padding: 11 }}>Plan</th><th style={{ padding: 11 }}>Game</th>
                {categories.map(category => <th key={category.key} style={{ padding: 11, whiteSpace: "nowrap" }}>{category.label}</th>)}
              </tr></thead>
              <tbody>{draft.plan_permissions.map(plan => <tr key={plan.plan_id} style={{ borderTop: "1px solid var(--admin-border, #e5e7eb)", opacity: plan.plan_active ? 1 : 0.6 }}>
                <td style={{ padding: 11 }}><strong>{plan.plan_name}</strong>{!plan.plan_active && <small style={{ display: "block" }}>Inactive plan</small>}</td>
                <td style={{ padding: 11 }}><input aria-label={plan.plan_name + " game access"} type="checkbox" checked={plan.enabled} disabled={!canEdit || saving || !plan.plan_active || !draft.active} onChange={event => updatePlan(plan.plan_id, { enabled: event.target.checked })} /></td>
                {categories.map(category => <td key={category.key} style={{ padding: 11, textAlign: "center" }}><input aria-label={plan.plan_name + " " + category.label} type="checkbox" checked={plan.allowed_customizations.includes(category.key)} disabled={!canEdit || saving || !plan.plan_active || !plan.enabled || !draft.feature_flags[category.key]} onChange={() => togglePlanCategory(plan, category.key)} /></td>)}
              </tr>)}</tbody>
            </table>
          </div>
        </div>

        {canEdit && <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
          <button type="button" className="primary-btn" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save game settings"}</button>
        </div>}
      </section>}
    </div>
  );
}
