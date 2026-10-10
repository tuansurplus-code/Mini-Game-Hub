"use client";
import { useEffect, useState } from "react";
import AdminModal from "../AdminModal";

type Plan = { id: string; slug: string; name: string; description: string; monthly_price_lkr: number | null; max_active_campaigns: number | null; max_monthly_participants: number | null; max_team_members: number | null; feature_flags: Record<string, boolean> };
type RequestItem = { id: string; amount_lkr: number; payment_reference: string; status: string; review_notes: string | null; created_at: string; subscription_plans?: { name: string; slug: string } | { name: string; slug: string }[] | null };
type Payload = { subscription: { status: string; period_end: string | null; subscription_plans: Plan | Plan[] | null } | null; plans: Plan[]; requests: RequestItem[] };
const box: React.CSSProperties = { background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 18 };
const money = (n: number | null) => n === null ? "Price not set" : `LKR ${Number(n).toLocaleString("en-LK", { minimumFractionDigits: 2 })} / month`;
const cap = (n: number | null, unit: string) => n === null ? `Unlimited ${unit}` : `${n.toLocaleString()} ${unit}`;

export default function BillingManager({ role }: { role: string }) {
  const [payload, setPayload] = useState<Payload | null>(null), [planId, setPlanId] = useState(""), [reference, setReference] = useState(""), [receipt, setReceipt] = useState<File | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [showUpgrade, setShowUpgrade] = useState(false);
  async function load() { const r = await fetch("/api/admin/billing", { cache: "no-store" }); const j = await r.json(); if (!r.ok) throw new Error(j.error || "Unable to load billing."); setPayload(j); }
  useEffect(() => { load().catch(e => setMessage(e.message)); }, []);
  async function submit(e: React.FormEvent) { e.preventDefault(); if (!receipt) { setMessage("Choose your payment receipt."); return; } setBusy(true); setMessage(""); try { const form = new FormData(); form.set("planId", planId); form.set("paymentReference", reference); form.set("receipt", receipt); const r = await fetch("/api/admin/billing", { method: "POST", body: form }); const j = await r.json(); if (!r.ok) throw new Error(j.error || "Unable to submit request."); setMessage("Request submitted. The platform team will review your payment."); setReference(""); setReceipt(null); setShowUpgrade(false); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to submit request."); } finally { setBusy(false); } }
  const subPlan = payload?.subscription?.subscription_plans; const savedPlan = Array.isArray(subPlan) ? subPlan[0] : subPlan; const expired = payload?.subscription?.status === "active" && Boolean(payload.subscription.period_end && new Date(payload.subscription.period_end).getTime() <= Date.now()); const currentPlan = expired ? payload?.plans.find(plan => plan.slug === "free") : savedPlan; const displayStatus = expired ? "expired (Free limits apply)" : payload?.subscription?.status ?? "Loading"; const pendingRequest = payload?.requests.some(item => item.status === "pending") ?? false;
  return <div><h1 style={{ marginBottom: 6 }}>Billing</h1><p style={{ color: "#666", marginTop: 0 }}>View your plan and submit a payment receipt for an upgrade.</p>
    <section style={box}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}><div><h2 style={{ marginTop: 0 }}>Current subscription</h2><p><strong>{currentPlan?.name ?? (payload?.subscription?.status === "grandfathered" ? "Existing workspace" : "Free")}</strong> · {displayStatus}</p>{payload?.subscription?.period_end && <p>Renews or ends {new Date(payload.subscription.period_end).toLocaleDateString()}</p>}{currentPlan && <p>{cap(currentPlan.max_active_campaigns, "active campaigns")} · {cap(currentPlan.max_monthly_participants, "unique participants / month")}</p>}</div>{role === "owner" && <button type="button" className="primary-btn" disabled={pendingRequest} onClick={() => setShowUpgrade(true)}>{pendingRequest ? "Request Under Review" : "Upgrade Plan"}</button>}</div></section>
    {role === "owner" && <AdminModal open={showUpgrade} title="Upgrade your plan" onClose={() => setShowUpgrade(false)} maxWidth={600}>
      <p style={{ color: "#5b6472", marginTop: 0 }}>Select a plan, enter your payment reference and upload the receipt. The new plan starts after approval.</p>
      {pendingRequest && <p role="status">You already have a request awaiting review.</p>}
      <form onSubmit={submit}>
        <label>Plan<select required value={planId} onChange={e => setPlanId(e.target.value)} style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 8 }}>
          <option value="">Choose a plan</option>{payload?.plans.filter(p => p.slug !== "free" && p.monthly_price_lkr !== null && Number(p.monthly_price_lkr) > 0).map(p => <option key={p.id} value={p.id}>{p.name} · {money(p.monthly_price_lkr)}</option>)}
        </select></label>
        <label>Payment reference<input required maxLength={120} value={reference} onChange={e => setReference(e.target.value)} style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 8 }} /></label>
        <label>Payment receipt (PDF, PNG, JPG, up to 4 MB)<input required type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={e => setReceipt(e.target.files?.[0] ?? null)} /></label>
        <button disabled={busy || pendingRequest || !planId || !receipt} className="primary-btn">{busy ? "Submitting…" : "Submit for review"}</button>
      </form>
    </AdminModal>}
    {message && <p role="status" style={{ margin: "12px 0", color: message.includes("submitted") ? "#166534" : "#b91c1c" }}>{message}</p>}
    <section style={box}><h2 style={{ marginTop: 0 }}>Request history</h2>{!payload?.requests.length ? <p>No requests yet.</p> : <div style={{ display: "grid", gap: 10 }}>{payload.requests.map(item => { const p = Array.isArray(item.subscription_plans) ? item.subscription_plans[0] : item.subscription_plans; return <div key={item.id} style={{ borderTop: "1px solid #eee", paddingTop: 12 }}><strong>{p?.name ?? "Plan"} · LKR {Number(item.amount_lkr).toLocaleString("en-LK")}</strong> · {item.status}<div style={{ color: "#666", fontSize: 13 }}>Reference: {item.payment_reference} · {new Date(item.created_at).toLocaleDateString()}</div>{item.review_notes && <div>Review note: {item.review_notes}</div>}</div>; })}</div>}</section>
  </div>;
}
