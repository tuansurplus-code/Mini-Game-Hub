"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { DEFAULT_HOMEPAGE_CONTENT, type HomepageContent, type SeasonalTheme } from "../../../lib/homepage-content";

type Metadata = { updatedAt: string | null; publishedAt: string | null; canEdit: boolean };
const presetColors: Record<SeasonalTheme["preset"], Pick<SeasonalTheme, "primary" | "accent" | "heroBackground" | "pageBackground">> = {
  christmas: { primary: "#b4232c", accent: "#35a36b", heroBackground: "#163529", pageBackground: "#f4f8f4" },
  "new-year": { primary: "#a77812", accent: "#f2cc63", heroBackground: "#182039", pageBackground: "#f7f6f1" },
  ramadan: { primary: "#14816f", accent: "#d9b45a", heroBackground: "#123b3a", pageBackground: "#f3f8f5" },
  custom: { primary: "#e31b23", accent: "#ff5b61", heroBackground: "#101828", pageBackground: "#f6f7f9" },
};

function TextField({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  return <label className="home-field"><span>{label}</span>{multiline
    ? <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} />
    : <input value={value} onChange={(event) => onChange(event.target.value)} />}</label>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="home-color-field"><span>{label}</span><input type="color" value={value} onChange={(event) => onChange(event.target.value)} /><code>{value}</code></label>;
}

export default function HomepageManager() {
  const [content, setContent] = useState<HomepageContent>(DEFAULT_HOMEPAGE_CONTENT);
  const [published, setPublished] = useState<HomepageContent>(DEFAULT_HOMEPAGE_CONTENT);
  const [metadata, setMetadata] = useState<Metadata>({ updatedAt: null, publishedAt: null, canEdit: false });
  const [status, setStatus] = useState("Loading homepage settings…");
  const [busy, setBusy] = useState(false);
  const [newPreset, setNewPreset] = useState<SeasonalTheme["preset"]>("christmas");

  useEffect(() => {
    fetch("/api/saas-admin/homepage").then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load settings.");
      setContent(result.draft);
      setPublished(result.published);
      setMetadata({ updatedAt: result.updatedAt, publishedAt: result.publishedAt, canEdit: result.canEdit });
      setStatus("");
    }).catch((error) => setStatus(error instanceof Error ? error.message : "Unable to load settings."));
  }, []);

  const update = (group: "header" | "hero" | "games" | "how" | "footer" | "theme", field: string, value: string | boolean) => {
    setContent((current) => ({ ...current, [group]: { ...current[group], [field]: value } }));
  };
  const updateStep = (index: number, field: "title" | "description", value: string) => setContent((current) => ({
    ...current, how: { ...current.how, steps: current.how.steps.map((step, i) => i === index ? { ...step, [field]: value } : step) },
  }));
  const updateGameCard = (index: number, field: "title" | "description" | "action", value: string) => setContent((current) => ({
    ...current, games: { ...current.games, cards: current.games.cards.map((card, i) => i === index ? { ...card, [field]: value } : card) },
  }));
  const updateTheme = (id: string, field: keyof SeasonalTheme, value: string | boolean) => setContent((current) => ({
    ...current, seasonalThemes: current.seasonalThemes.map((theme) => theme.id === id ? { ...theme, [field]: value } : theme),
  }));

  async function save(action: "save" | "publish") {
    setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/saas-admin/homepage", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, content }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save settings.");
      setMetadata((current) => ({ ...current, updatedAt: result.updatedAt, publishedAt: result.publishedAt ?? current.publishedAt }));
      if (action === "publish") setPublished(content);
      setStatus(action === "publish" ? "Homepage published. Theme dates will activate automatically." : "Draft saved.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to save settings."); }
    finally { setBusy(false); }
  }

  function addTheme() {
    const names: Record<SeasonalTheme["preset"], string> = { christmas: "Christmas", "new-year": "New Year", ramadan: "Ramadan", custom: "Seasonal theme" };
    const colors = presetColors[newPreset];
    const item: SeasonalTheme = { id: crypto.randomUUID(), name: names[newPreset], preset: newPreset, startsAt: "", endsAt: "", announcement: "", enabled: true, ...colors };
    setContent((current) => ({ ...current, seasonalThemes: [...current.seasonalThemes, item] }));
  }

  const previewStyle = { "--home-primary": content.theme.primary, "--home-accent": content.theme.accent, "--home-hero": content.theme.heroBackground, "--home-bg": content.theme.pageBackground } as CSSProperties;

  return <>
    <div className="admin-header"><div><div className="eyebrow">PUBLIC WEBSITE</div><h1>Homepage layout</h1><p>Edit the public homepage and schedule seasonal looks.</p></div><div className="home-actions"><button className="home-secondary" onClick={() => setContent(published)} disabled={!metadata.canEdit}>Discard draft</button><button className="primary-btn" onClick={() => save("save")} disabled={busy || !metadata.canEdit}>Save draft</button><button className="primary-btn home-publish" onClick={() => save("publish")} disabled={busy || !metadata.canEdit}>Publish</button></div></div>
    {status && <div className={status.includes("Unable") || status.includes("Check") ? "error-box" : "home-notice"}>{status}</div>}
    {!metadata.canEdit && !status && <div className="home-notice">View only access. Ask a Super Admin or Admin to edit and publish homepage content.</div>}
    <div className="homepage-editor-grid">
      <fieldset className="homepage-edit-column home-editor-fieldset" disabled={!metadata.canEdit}>
        <section className="admin-panel home-editor-panel"><div className="home-panel-heading"><div><span className="home-step-index">01</span><h2>Header</h2></div><small>Brand, announcement and navigation labels</small></div>
          <div className="home-fields"><TextField label="Brand name" value={content.header.brand} onChange={(v) => update("header", "brand", v)} /><TextField label="Announcement bar text" value={content.header.announcement} onChange={(v) => update("header", "announcement", v)} /></div>
          <label className="home-check"><input type="checkbox" checked={content.header.showAnnouncement} onChange={(e) => update("header", "showAnnouncement", e.target.checked)} /><span>Show announcement bar</span></label>
        </section>

        <section className="admin-panel home-editor-panel"><div className="home-panel-heading"><div><span className="home-step-index">02</span><h2>Body content</h2></div><small>Hero, games section and steps</small></div>
          <h3 className="home-subheading">Hero section</h3><div className="home-fields"><TextField label="Eyebrow" value={content.hero.eyebrow} onChange={(v) => update("hero", "eyebrow", v)} /><TextField label="Main title" value={content.hero.title} onChange={(v) => update("hero", "title", v)} /><TextField label="Highlighted title" value={content.hero.highlight} onChange={(v) => update("hero", "highlight", v)} /><TextField label="Primary button" value={content.hero.primaryCta} onChange={(v) => update("hero", "primaryCta", v)} /><TextField label="Secondary button" value={content.hero.secondaryCta} onChange={(v) => update("hero", "secondaryCta", v)} /><TextField label="Description" value={content.hero.description} onChange={(v) => update("hero", "description", v)} multiline /></div>
          <h3 className="home-subheading">Games section</h3><div className="home-fields"><TextField label="Eyebrow" value={content.games.eyebrow} onChange={(v) => update("games", "eyebrow", v)} /><TextField label="Section title" value={content.games.title} onChange={(v) => update("games", "title", v)} /><TextField label="Section note" value={content.games.description} onChange={(v) => update("games", "description", v)} />{content.games.cards.map((card, i) => <div className="home-step-fields" key={i}><b>Game card {i + 1}</b><TextField label="Title" value={card.title} onChange={(v) => updateGameCard(i, "title", v)} /><TextField label="Button label" value={card.action} onChange={(v) => updateGameCard(i, "action", v)} /><TextField label="Description" value={card.description} onChange={(v) => updateGameCard(i, "description", v)} multiline /></div>)}</div>
          <h3 className="home-subheading">How it works</h3><div className="home-fields"><TextField label="Eyebrow" value={content.how.eyebrow} onChange={(v) => update("how", "eyebrow", v)} /><TextField label="Section title" value={content.how.title} onChange={(v) => update("how", "title", v)} />{content.how.steps.map((step, i) => <div className="home-step-fields" key={i}><b>Step {i + 1}</b><TextField label="Title" value={step.title} onChange={(v) => updateStep(i, "title", v)} /><TextField label="Description" value={step.description} onChange={(v) => updateStep(i, "description", v)} multiline /></div>)}</div>
        </section>

        <section className="admin-panel home-editor-panel"><div className="home-panel-heading"><div><span className="home-step-index">03</span><h2>Footer</h2></div><small>Copyright and link labels</small></div><div className="home-fields"><TextField label="Copyright" value={content.footer.copyright} onChange={(v) => update("footer", "copyright", v)} /><TextField label="Terms link label" value={content.footer.termsLabel} onChange={(v) => update("footer", "termsLabel", v)} /><TextField label="Privacy link label" value={content.footer.privacyLabel} onChange={(v) => update("footer", "privacyLabel", v)} /></div></section>

        <section className="admin-panel home-editor-panel"><div className="home-panel-heading"><div><span className="home-step-index">04</span><h2>Brand theme</h2></div><small>Default homepage colors</small></div><div className="home-colors">{(["primary", "accent", "heroBackground", "pageBackground"] as const).map((key) => <ColorField key={key} label={{ primary: "Primary", accent: "Accent", heroBackground: "Hero background", pageBackground: "Page background" }[key]} value={content.theme[key]} onChange={(v) => update("theme", key, v)} />)}</div></section>

        <section className="admin-panel home-editor-panel"><div className="home-panel-heading"><div><span className="home-step-index">05</span><h2>Seasonal themes</h2></div><small>Enable a theme for a date range</small></div>
          <div className="seasonal-add-row"><select value={newPreset} onChange={(e) => setNewPreset(e.target.value as SeasonalTheme["preset"])}><option value="christmas">Christmas</option><option value="new-year">New Year</option><option value="ramadan">Ramadan</option><option value="custom">Custom palette</option></select><button type="button" className="home-secondary" onClick={addTheme} disabled={!metadata.canEdit || content.seasonalThemes.length >= 12}>Add seasonal theme</button></div>
          {content.seasonalThemes.length === 0 && <div className="home-empty-season">No seasonal themes yet. Add one, choose its date range, then publish to schedule it.</div>}
          <div className="seasonal-theme-list">{content.seasonalThemes.map((theme) => <article className="seasonal-theme-card" key={theme.id}>
            <div className="seasonal-theme-top"><div><strong>{theme.name}</strong><span>{theme.preset === "new-year" ? "New Year" : theme.preset[0].toUpperCase() + theme.preset.slice(1)}</span></div><label className="home-check"><input type="checkbox" checked={theme.enabled} onChange={(e) => updateTheme(theme.id, "enabled", e.target.checked)} /><span>Enabled</span></label><button type="button" className="home-remove" aria-label={`Remove ${theme.name}`} onClick={() => setContent((current) => ({ ...current, seasonalThemes: current.seasonalThemes.filter((item) => item.id !== theme.id) }))}>Remove</button></div>
            <div className="home-fields"><TextField label="Theme name" value={theme.name} onChange={(v) => updateTheme(theme.id, "name", v)} /><TextField label="Announcement (optional)" value={theme.announcement} onChange={(v) => updateTheme(theme.id, "announcement", v)} /></div>
            <div className="seasonal-date-row"><label className="home-field"><span>Starts</span><input type="date" value={theme.startsAt} onChange={(e) => updateTheme(theme.id, "startsAt", e.target.value)} /></label><label className="home-field"><span>Ends</span><input type="date" value={theme.endsAt} onChange={(e) => updateTheme(theme.id, "endsAt", e.target.value)} /></label></div>
            <div className="home-colors compact">{(["primary", "accent", "heroBackground", "pageBackground"] as const).map((key) => <ColorField key={key} label={{ primary: "Primary", accent: "Accent", heroBackground: "Hero", pageBackground: "Page" }[key]} value={theme[key]} onChange={(v) => updateTheme(theme.id, key, v)} />)}</div>
          </article>)}</div>
        </section>
      </fieldset>
      <aside className="homepage-preview-wrap"><div className="homepage-preview-title"><div><div className="eyebrow">LIVE PREVIEW</div><h2>Homepage</h2></div><span>Draft</span></div><div className="homepage-preview" style={previewStyle}><header>{content.header.brand}</header>{content.header.showAnnouncement && <div className="preview-announcement">{content.header.announcement}</div>}<section className="preview-hero"><small>{content.hero.eyebrow}</small><h3>{content.hero.title}<br /><b>{content.hero.highlight}</b></h3><p>{content.hero.description}</p><button>{content.hero.primaryCta}</button></section><section className="preview-body"><small>{content.games.eyebrow}</small><h3>{content.games.title}</h3><div className="preview-game-cards"><i /><i /><i /></div><small>{content.how.eyebrow}</small><h3>{content.how.title}</h3></section><footer>{content.footer.copyright}<br />{content.footer.termsLabel}　{content.footer.privacyLabel}</footer></div><div className="homepage-version-note">{metadata.publishedAt ? `Last published ${new Date(metadata.publishedAt).toLocaleString()}` : "Not published yet"}</div></aside>
    </div>
  </>;
}
