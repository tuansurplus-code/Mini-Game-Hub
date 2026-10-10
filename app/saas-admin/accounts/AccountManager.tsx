"use client";

import { FormEvent, useState } from "react";

type Workspace = { id: string; name: string; slug: string; status: string; created_at: string; memberCount: number; campaignCount: number; planName: string; subscriptionStatus?: string; periodEnd?: string };
type Props = { initial: Workspace[]; canManage: boolean };
type Draft = { id?: string; name: string; slug: string; email: string; fullName: string; status: string };
const input = { width: "100%", padding: 11, border: "1px solid #cbd5e1", borderRadius: 8, boxSizing: "border-box" as const };

export default function AccountManager({ initial, canManage }: Props) {
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  function startCreate() { setError(""); setNotice(""); setDraft({ name: "", slug: "", email: "", fullName: "", status: "active" }); }
  function startEdit(row: Workspace) { setError(""); setNotice(""); setDraft({ id: row.id, name: row.name, slug: row.slug, email: "", fullName: "", status: row.status }); }
  function setName(name: string) {
    setDraft(current => current ? { ...current, name, slug: current.id ? current.slug : name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) } : current);
  }

  async function save(event: FormEvent) {
    event.preventDefault(); if (!draft) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/saas-admin/accounts", {
        method: draft.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft.id ? draft : { ...draft, name: draft.name, slug: draft.slug }),
      });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to save account.");
      if (draft.id) {
        setRows(current => current.map(row => row.id === data.workspace.id ? { ...row, ...data.workspace } : row));
      } else {
        setRows(current => [{ ...data.workspace, memberCount: 1, campaignCount: 0, planName: "—" }, ...current]);
        setCredentials(data.credentials);
      }
      setDraft(null); setNotice(draft.id ? "Customer account updated." : "Customer account created.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save account."); }
    finally { setSaving(false); }
  }

  async function disable(row: Workspace) {
    if (!window.confirm(`Disable ${row.name}? Its campaigns and history will be preserved, and you can re-enable it later.`)) return;
    await setStatus(row, "disabled");
  }

  async function setStatus(row: Workspace, status: string) {
    setError(""); setNotice("");
    const response = status === "disabled"
      ? await fetch("/api/saas-admin/accounts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id }) })
      : await fetch("/api/saas-admin/accounts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, name: row.name, slug: row.slug, status }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Unable to update account status."); return; }
    setRows(current => current.map(item => item.id === row.id ? { ...item, status } : item));
    setNotice(status === "disabled" ? `${row.name} disabled. Its data is preserved.` : `${row.name} re-enabled.`);
  }

  return <>
    {error && <p role="alert" className="admin-panel" style={{ color: "#991b1b" }}>{error}</p>}
    {notice && <p role="status" className="admin-panel" style={{ color: "#065f46" }}>{notice}</p>}
    {credentials && <div className="admin-panel" style={{ border: "2px solid #2563eb", marginBottom: 18 }}>
      <h2>Customer login created — copy these credentials</h2><p>Email: <b>{credentials.email}</b></p><p>Temporary password: <code style={{ overflowWrap: "anywhere" }}>{credentials.password}</code></p>
      <p>This password is shown once. The customer will be asked to change it after first sign-in.</p><button onClick={() => setCredentials(null)}>I saved these details</button>
    </div>}
    {!canManage && <div className="admin-panel">Only Super Admins can create, edit or disable customer accounts.</div>}
    <div className="admin-panel" style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}><h2 style={{ margin: 0 }}>Customer accounts</h2>{canManage && <button className="primary-btn" onClick={startCreate}>Create Account</button>}</div>
      <table className="admin-table" style={{ minWidth: 900, width: "100%" }}>
        <thead><tr><th>Workspace</th><th>URL</th><th>Status</th><th>Plan</th><th>Members</th><th>Campaigns</th><th>Created</th>{canManage && <th>Actions</th>}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.id}>
          <td><strong>{row.name}</strong></td><td>{row.slug}</td><td><span className="status-pill">{row.status}</span></td>
          <td><strong>{row.planName}</strong>{row.subscriptionStatus && <div style={{ color: "#6b7280", fontSize: 12 }}>{row.subscriptionStatus.replace(/_/g, " ")}{row.periodEnd ? ` · through ${new Date(row.periodEnd).toLocaleDateString("en-LK")}` : ""}</div>}</td>
          <td>{row.memberCount}</td><td>{row.campaignCount}</td><td>{new Date(row.created_at).toLocaleDateString("en-LK")}</td>
          {canManage && <td style={{ whiteSpace: "nowrap" }}><button onClick={() => startEdit(row)}>Edit</button>{row.status !== "disabled" ? <button style={{ marginLeft: 8 }} onClick={() => void disable(row)}>Disable</button> : <button style={{ marginLeft: 8 }} onClick={() => void setStatus(row, "active")}>Re-enable</button>}</td>}
        </tr>)}</tbody>
      </table>
      {!rows.length && <p>No customer accounts yet.</p>}
    </div>
    {draft && <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setDraft(null); }} style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 20, background: "rgba(0,0,0,.58)" }}>
      <section role="dialog" aria-modal="true" aria-labelledby="account-dialog-title" className="admin-panel" style={{ width: "min(520px, 100%)", maxHeight: "calc(100vh - 40px)", overflowY: "auto", border: "1px solid #cbd5e1", borderRadius: 16, padding: 26, boxShadow: "0 24px 80px rgba(0,0,0,.35)" }}>
      <form onSubmit={save} style={{ display: "grid", gap: 14 }}>
        <h2 id="account-dialog-title" style={{ margin: 0 }}>{draft.id ? "Edit Customer Account" : "Create Customer Account"}</h2>
        <label>Workspace name<input required maxLength={120} style={input} value={draft.name} onChange={e => setName(e.target.value)} /></label>
        <label>Workspace URL<input required maxLength={60} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" style={input} value={draft.slug} onChange={e => setDraft({ ...draft, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} /></label>
        {draft.id ? <label>Status<select style={input} value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}><option value="active">Active</option><option value="suspended">Suspended</option><option value="disabled">Disabled</option></select></label> : <>
          <label>Workspace owner name<input required maxLength={120} style={input} value={draft.fullName} onChange={e => setDraft({ ...draft, fullName: e.target.value })} /></label>
          <label>Workspace owner email<input required type="email" maxLength={254} style={input} value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} /></label>
          <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>A new customer login will be created as the workspace owner. Its temporary password appears once after creation.</p>
        </>}
        {error && <p role="alert" style={{ margin: 0, color: "#991b1b" }}>{error}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}><button type="button" disabled={saving} onClick={() => { setDraft(null); setError(""); }}>Cancel</button><button className="primary-btn" disabled={saving}>{saving ? "Saving…" : draft.id ? "Save Changes" : "Create Account"}</button></div>
      </form>
      </section>
    </div>}
  </>;
}
