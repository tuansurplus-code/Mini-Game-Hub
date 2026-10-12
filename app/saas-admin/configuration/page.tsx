"use client";

import { useEffect, useState } from "react";

type AnalyticsSettings = { gtmEnabled: boolean; gtmContainerId: string };

export default function ConfigurationPage() {
  const [settings, setSettings] = useState<AnalyticsSettings>({ gtmEnabled: false, gtmContainerId: "" });
  const [canEdit, setCanEdit] = useState(false);
  const [status, setStatus] = useState("Loading configuration…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/saas-admin/configuration")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load configuration.");
        setSettings(result.analytics);
        setCanEdit(result.canEdit === true);
        setStatus("");
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "Unable to load configuration."));
  }, []);

  async function save() {
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/saas-admin/configuration", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save configuration.");
      setSettings(result.analytics);
      setStatus("Website analytics configuration saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save configuration.");
    } finally {
      setBusy(false);
    }
  }

  return <div>
    <header className="admin-header">
      <div><h1>Configuration</h1><p>Manage integrations for the Mini Game Hub public website.</p></div>
    </header>
    <section className="admin-panel" aria-labelledby="website-analytics-title">
      <div className="home-panel-heading">
        <div><h2 id="website-analytics-title">Website analytics</h2><p>Connect Google Tag Manager to manage analytics and marketing tags on the public homepage.</p></div>
        <span className="status-pill">{settings.gtmEnabled ? "Enabled" : "Disabled"}</span>
      </div>
      <label className="home-check" style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
        <input type="checkbox" checked={settings.gtmEnabled} disabled={!canEdit || busy} onChange={(event) => setSettings((current) => ({ ...current, gtmEnabled: event.target.checked }))} />
        <span>Enable Google Tag Manager on the public homepage</span>
      </label>
      <label className="home-field" style={{ display: "block", maxWidth: 520 }}>
        <span>GTM container ID</span>
        <input value={settings.gtmContainerId} disabled={!canEdit || busy} placeholder="GTM-ABC1234" autoComplete="off" onChange={(event) => setSettings((current) => ({ ...current, gtmContainerId: event.target.value.toUpperCase() }))} />
      </label>
      <p style={{ maxWidth: 680, lineHeight: 1.6 }}>Add your GTM container ID here. Set up GA4, Meta Pixel, or other tags inside Google Tag Manager. The container loads only on the public homepage, and only when enabled.</p>
      {!canEdit && <p>Only Super Admins and Admins can change this setting.</p>}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 18 }}>
        <button className="primary-btn" type="button" onClick={save} disabled={!canEdit || busy}>{busy ? "Saving…" : "Save configuration"}</button>
        {status && <span role="status" aria-live="polite">{status}</span>}
      </div>
    </section>
  </div>;
}
