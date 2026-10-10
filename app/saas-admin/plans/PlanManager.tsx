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

function nullableNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export default function PlanManager({ canEdit }: Props) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
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

  function updatePlan(id: string, patch: Partial<Plan>) {
    setPlans(current => current.map(plan => plan.id === id ? { ...plan, ...patch } : plan));
  }

  async function save(event: FormEvent<HTMLFormElement>, plan: Plan) {
    event.preventDefault();
    if ([plan.monthly_price_lkr, plan.max_active_campaigns, plan.max_monthly_participants, plan.max_team_members].some(value => typeof value === "number" && !Number.isFinite(value))) {
      setError("Enter a valid price or whole-number limit before saving.");
      return;
    }
    setSavingId(plan.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/saas-admin/plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save this plan.");
      updatePlan(plan.id, data.plan);
      setMessage(`${plan.name} plan saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save this plan.");
    } finally {
      setSavingId("");
    }
  }

  const input = (value: string, onChange: (value: string) => void, label: string, type = "text") =>
    <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600 }}>{label}
      <input style={field} type={type} value={value} disabled={!canEdit} onChange={event => onChange(event.target.value)} />
    </label>;

  if (loading) return <div className="admin-panel">Loading plan configuration…</div>;

  return <div>
    {error && <div role="alert" className="admin-panel" style={{ color: "#991b1b", background: "#fef2f2" }}>{error}</div>}
    {message && <div role="status" className="admin-panel" style={{ color: "#065f46", background: "#ecfdf5" }}>{message}</div>}
    {!canEdit && <div className="admin-panel">Your platform role can view plans but cannot change them.</div>}
    <div className="admin-grid">
      {plans.map(plan => <form key={plan.id} className="admin-panel" onSubmit={event => void save(event, plan)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
          <div><div className="eyebrow">{plan.slug.toUpperCase()}</div><h2 style={{ margin: "6px 0 16px" }}>{plan.name}</h2></div>
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}>
            <input type="checkbox" checked={plan.active} disabled={!canEdit} onChange={event => updatePlan(plan.id, { active: event.target.checked })} />
            Available
          </label>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {input(plan.name, value => updatePlan(plan.id, { name: value }), "Plan name")}
          {input(plan.description, value => updatePlan(plan.id, { description: value }), "Description")}
          {input(plan.monthly_price_lkr == null ? "" : String(plan.monthly_price_lkr), value => updatePlan(plan.id, { monthly_price_lkr: nullableNumber(value) }), "Monthly price (LKR)", "number")}
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: -8 }}>Leave blank to keep the plan unavailable for payment requests until its price is set.</div>
          {input(plan.max_active_campaigns == null ? "" : String(plan.max_active_campaigns), value => updatePlan(plan.id, { max_active_campaigns: nullableNumber(value) }), "Active campaign limit (blank = unlimited)", "number")}
          {input(plan.max_monthly_participants == null ? "" : String(plan.max_monthly_participants), value => updatePlan(plan.id, { max_monthly_participants: nullableNumber(value) }), "Unique participants per month (blank = unlimited)", "number")}
          {input(plan.max_team_members == null ? "" : String(plan.max_team_members), value => updatePlan(plan.id, { max_team_members: nullableNumber(value) }), "Team member limit (blank = unlimited)", "number")}
          <div style={{ display: "grid", gap: 8 }}>
            <strong style={{ fontSize: 13 }}>Features</strong>
            {[
              ["custom_branding", "Custom campaign branding"],
              ["automatic_scheduling", "Automatic campaign scheduling"],
              ["advanced_reports", "Advanced reports"],
            ].map(([key, label]) => <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={Boolean(plan.feature_flags?.[key])} disabled={!canEdit}
                onChange={event => updatePlan(plan.id, { feature_flags: { ...plan.feature_flags, [key]: event.target.checked } })} />
              {label}
            </label>)}
          </div>
          {canEdit && <button className="primary-btn" type="submit" disabled={savingId === plan.id}>{savingId === plan.id ? "Saving…" : "Save plan"}</button>}
        </div>
      </form>)}
    </div>
  </div>;
}
