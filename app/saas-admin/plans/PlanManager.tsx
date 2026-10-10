"use client";

import { FormEvent, useEffect, useState } from "react";

type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string;
  monthly_price_lkr: number | string | null;
  max_active_campaigns: number | null;
  max_monthly_participants: number | null;
  max_team_members: number | null;
  feature_flags: Record<string, boolean>;
  active: boolean;
  sort_order: number;
};

type Props = { canEdit: boolean };
const field = { width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, boxSizing: "border-box" as const };
const featureLabels: Record<string, string> = {
  custom_branding: "Custom branding",
  automatic_scheduling: "Automatic scheduling",
  advanced_reports: "Advanced reports",
};
const cap = (value: number | null, suffix: string) => value === null ? `Unlimited ${suffix}` : `${value.toLocaleString()} ${suffix}`;
const price = (value: number | string | null) => value === null ? "Price not set" : Number(value) === 0 ? "Free" : `LKR ${Number(value).toLocaleString("en-LK", { minimumFractionDigits: 2 })} / month`;

function nullableNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export default function PlanManager({ canEdit }: Props) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [draft, setDraft] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/saas-admin/plans", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load plans.");
      setPlans(data.plans ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load plans.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function updateDraft(patch: Partial<Plan>) {
    setDraft(current => current ? { ...current, ...patch } : current);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    if ([draft.monthly_price_lkr, draft.max_active_campaigns, draft.max_monthly_participants, draft.max_team_members]
      .some(value => typeof value === "number" && !Number.isFinite(value))) {
      setError("Enter a valid price or whole-number limit before saving.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/saas-admin/plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save this plan.");
      setPlans(current => current.map(plan => plan.id === draft.id ? data.plan : plan));
      setDraft(null);
      setMessage(`${data.plan.name} plan saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save this plan.");
    } finally {
      setSaving(false);
    }
  }

  const input = (label: string, value: string, onChange: (value: string) => void, type = "text") =>
    <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600 }}>{label}
      <input style={field} type={type} value={value} disabled={saving} onChange={event => onChange(event.target.value)} />
    </label>;

  if (loading) return <div className="admin-panel">Loading plan configuration…</div>;

  return <div>
    {error && <div role="alert" className="admin-panel" style={{ color: "#991b1b", background: "#fef2f2" }}>{error}</div>}
    {message && <div role="status" className="admin-panel" style={{ color: "#065f46", background: "#ecfdf5" }}>{message}</div>}
    {!canEdit && <div className="admin-panel">Your platform role can view plans but cannot change them.</div>}
    <div style={{ display: "grid", gap: 14 }}>
      {plans.map(plan => {
        const enabledFeatures = Object.entries(plan.feature_flags ?? {}).filter(([, enabled]) => enabled).map(([key]) => featureLabels[key] ?? key);
        const editing = draft?.id === plan.id;
        return <section key={plan.id} className="admin-panel" style={{ margin: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div className="eyebrow">{plan.slug.toUpperCase()} · {plan.active ? "AVAILABLE" : "HIDDEN"}</div>
              <h2 style={{ margin: "5px 0" }}>{plan.name}</h2>
              <p style={{ margin: 0, color: "#6b7280" }}>{plan.description || "No description"}</p>
            </div>
            {canEdit && !editing && <button type="button" className="secondary-btn" onClick={() => { setError(""); setMessage(""); setDraft({ ...plan, feature_flags: { ...plan.feature_flags } }); }}>Edit</button>}
          </div>
          {!editing && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 18, paddingTop: 16, borderTop: "1px solid #eee" }}>
            <div><small style={{ color: "#6b7280" }}>MONTHLY PRICE</small><div style={{ fontWeight: 700 }}>{price(plan.monthly_price_lkr)}</div></div>
            <div><small style={{ color: "#6b7280" }}>CAMPAIGNS</small><div style={{ fontWeight: 700 }}>{cap(plan.max_active_campaigns, "active")}</div></div>
            <div><small style={{ color: "#6b7280" }}>PARTICIPANTS</small><div style={{ fontWeight: 700 }}>{cap(plan.max_monthly_participants, "unique / month")}</div></div>
            <div><small style={{ color: "#6b7280" }}>TEAM</small><div style={{ fontWeight: 700 }}>{cap(plan.max_team_members, "members")}</div></div>
            <div><small style={{ color: "#6b7280" }}>FEATURES</small><div style={{ fontWeight: 700 }}>{enabledFeatures.length ? enabledFeatures.join(" · ") : "No extra features"}</div></div>
          </div>}
          {editing && draft && <form onSubmit={event => void save(event)} style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #eee" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              {input("Plan name", draft.name, value => updateDraft({ name: value }))}
              {input("Description", draft.description, value => updateDraft({ description: value }))}
              {input("Monthly price (LKR)", draft.monthly_price_lkr == null ? "" : String(draft.monthly_price_lkr), value => updateDraft({ monthly_price_lkr: nullableNumber(value) }), "number")}
              {input("Active campaign limit (blank = unlimited)", draft.max_active_campaigns == null ? "" : String(draft.max_active_campaigns), value => updateDraft({ max_active_campaigns: nullableNumber(value) }), "number")}
              {input("Unique participants per month (blank = unlimited)", draft.max_monthly_participants == null ? "" : String(draft.max_monthly_participants), value => updateDraft({ max_monthly_participants: nullableNumber(value) }), "number")}
              {input("Team member limit (blank = unlimited)", draft.max_team_members == null ? "" : String(draft.max_team_members), value => updateDraft({ max_team_members: nullableNumber(value) }), "number")}
            </div>
            <p style={{ color: "#6b7280", fontSize: 12, margin: "8px 0 16px" }}>Leave a price blank to disable paid requests for this plan. Blank limits mean unlimited.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={draft.active} disabled={saving} onChange={event => updateDraft({ active: event.target.checked })} /> Available for new subscriptions</label>
              {Object.entries(featureLabels).map(([key, label]) => <label key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={Boolean(draft.feature_flags?.[key])} disabled={saving} onChange={event => updateDraft({ feature_flags: { ...draft.feature_flags, [key]: event.target.checked } })} /> {label}</label>)}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid #eee" }}>
              <button type="button" className="secondary-btn" disabled={saving} onClick={() => { setDraft(null); setError(""); }}>Cancel</button>
              <button type="submit" className="primary-btn" disabled={saving}>{saving ? "Saving…" : "Save plan"}</button>
            </div>
          </form>}
        </section>;
      })}
    </div>
  </div>;
}
