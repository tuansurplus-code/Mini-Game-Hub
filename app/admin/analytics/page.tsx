"use client";

import { useEffect, useState } from "react";

type AnalyticsSettings = { available: boolean; enabled: boolean; containerId: string };

export default function CampaignAnalyticsPage() {
  const [settings, setSettings] = useState<AnalyticsSettings>({ available: false, enabled: false, containerId: "" });
  const [canEdit, setCanEdit] = useState(false);
  const [status, setStatus] = useState("Loading analytics settings…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/analytics", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load analytics settings.");
        setSettings(result.analytics);
        setCanEdit(result.canEdit === true);
        setStatus("");
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "Unable to load analytics settings."));
  }, []);

  async function save() {
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/analytics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: settings.enabled, containerId: settings.containerId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save analytics settings.");
      setSettings(result.analytics);
      setStatus("Campaign analytics settings saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save analytics settings.");
    } finally {
      setBusy(false);
    }
  }

  return <div>
    <header className="admin-header">
      <div><div className="eyebrow">CAMPAIGN SETTINGS</div><h1>Campaign Analytics</h1><p>Connect your Google Tag Manager container to your published customer links.</p></div>
    </header>
    <section className="admin-panel" aria-labelledby="campaign-analytics-title">
      <div className="home-panel-heading">
        <div><h2 id="campaign-analytics-title">Google Tag Manager</h2><p>Your container will load on this workspace’s published campaign pages and game links.</p></div>
        <span className="status-pill">{!settings.available ? "Plan required" : settings.enabled ? "Enabled" : "Disabled"}</span>
      </div>
      {!settings.available
        ? <div role="status" style={{ marginTop: 16 }}>
            <p>Campaign analytics is not included in your current plan. Contact your platform administrator to review plan access.</p>
            <a className="secondary-btn" href="/admin/billing">View plan and billing</a>
          </div>
        : <>
            <label className="home-check" style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
              <input type="checkbox" checked={settings.enabled} disabled={!canEdit || busy} onChange={event => setSettings(current => ({ ...current, enabled: event.target.checked }))} />
              <span>Enable tracking on customer campaign links</span>
            </label>
            <label className="home-field" style={{ display: "block", maxWidth: 520 }}>
              <span>GTM container ID</span>
              <input value={settings.containerId} disabled={!canEdit || busy} placeholder="GTM-ABC1234" autoComplete="off" onChange={event => setSettings(current => ({ ...current, containerId: event.target.value.toUpperCase() }))} />
            </label>
            <p style={{ maxWidth: 700, lineHeight: 1.6 }}>Set up GA4, Meta Pixel, or other tags inside Google Tag Manager. Only the GTM container ID is stored here; custom scripts are not accepted.</p>
            {!canEdit && <p>Only workspace owners and admins can change this setting.</p>}
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 18 }}>
              <button className="primary-btn" type="button" onClick={save} disabled={!canEdit || busy}>{busy ? "Saving…" : "Save settings"}</button>
              {status && <span role="status" aria-live="polite">{status}</span>}
            </div>
          </>}
    </section>
  </div>;
}
