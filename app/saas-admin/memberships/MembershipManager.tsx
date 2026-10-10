"use client";

import { FormEvent, useState } from "react";

export type Membership = { user_id: string; email: string; workspace_id: string; workspace_name: string; workspace_slug: string; workspace_status: string; role: "owner" | "admin" | "editor" | "viewer"; created_at: string };
type Workspace = { id: string; name: string; slug: string };
const input = { width: "100%", padding: 11, border: "1px solid #cbd5e1", borderRadius: 8, boxSizing: "border-box" as const };
const labels: Record<Membership["role"], string> = { owner: "Owner", admin: "Admin", editor: "Editor", viewer: "Viewer" };

export default function MembershipManager({ initial, workspaces, canManage }: { initial: Membership[]; workspaces: Workspace[]; canManage: boolean }) {
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState<{ workspaceId: string; email: string; role: Membership["role"] } | null>(null);
  const [roleChanges, setRoleChanges] = useState<Record<string, Membership["role"]>>({});
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [saving, setSaving] = useState(false);
  const key = (row: Membership) => `${row.workspace_id}:${row.user_id}`;

  async function add(event: FormEvent) {
    event.preventDefault(); if (!draft) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/saas-admin/memberships", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to add member.");
      const workspace = workspaces.find(item => item.id === draft.workspaceId)!;
      setRows(current => [{ user_id: data.userId, email: draft.email, workspace_id: workspace.id, workspace_name: workspace.name, workspace_slug: workspace.slug, workspace_status: "active", role: draft.role, created_at: new Date().toISOString() }, ...current]);
      setDraft(null); setNotice("Workspace membership added.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to add member."); }
    finally { setSaving(false); }
  }

  async function saveRole(row: Membership) {
    const role = roleChanges[key(row)]; if (!role) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/saas-admin/memberships", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: row.workspace_id, userId: row.user_id, role }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to update member.");
      setRows(current => current.map(item => key(item) === key(row) ? { ...item, role } : item));
      setRoleChanges(current => { const next = { ...current }; delete next[key(row)]; return next; }); setNotice("Workspace role updated.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to update member."); }
    finally { setSaving(false); }
  }

  async function remove(row: Membership) {
    if (!window.confirm(`Remove ${row.email} from ${row.workspace_name}? Their login and workspace data will remain.`)) return;
    setError(""); setNotice("");
    const response = await fetch("/api/saas-admin/memberships", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: row.workspace_id, userId: row.user_id }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Unable to remove member."); return; }
    setRows(current => current.filter(item => key(item) !== key(row))); setNotice("Workspace access removed. The customer login and workspace data were preserved.");
  }

  return <>
    {error && <p role="alert" className="admin-panel" style={{ color: "#991b1b" }}>{error}</p>}{notice && <p role="status" className="admin-panel" style={{ color: "#065f46" }}>{notice}</p>}
    {!canManage && <div className="admin-panel">Only Super Admins can add, change or remove customer workspace memberships.</div>}
    <div className="admin-panel" style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}><h2 style={{ margin: 0 }}>Workspace memberships</h2>{canManage && <button className="primary-btn" onClick={() => { setError(""); setDraft({ workspaceId: workspaces[0]?.id ?? "", email: "", role: "admin" }); }}>Add Member</button>}</div>
      <table className="admin-table" style={{ minWidth: 850 }}><thead><tr><th>Customer login</th><th>Workspace</th><th>Workspace role</th><th>Status</th><th>Joined</th>{canManage && <th>Actions</th>}</tr></thead>
        <tbody>{rows.map(row => { const edited = roleChanges[key(row)] ?? row.role; const ownerCount = rows.filter(other => other.workspace_id === row.workspace_id && other.role === "owner").length;
          return <tr key={key(row)}><td>{row.email}</td><td><strong>{row.workspace_name}</strong><br /><small>{row.workspace_slug}</small></td>
            <td>{canManage ? <select aria-label={`Role for ${row.email}`} value={edited} disabled={saving || (row.role === "owner" && ownerCount === 1)} onChange={e => setRoleChanges(current => ({ ...current, [key(row)]: e.target.value as Membership["role"] }))}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> : labels[row.role]}</td>
            <td>{row.workspace_status}</td><td>{new Date(row.created_at).toLocaleDateString("en-LK")}</td>
            {canManage && <td style={{ whiteSpace: "nowrap" }}>{edited !== row.role && <button disabled={saving} onClick={() => void saveRole(row)}>Save</button>}<button disabled={saving || (row.role === "owner" && ownerCount === 1)} style={{ marginLeft: 8 }} onClick={() => void remove(row)}>Remove</button></td>}
          </tr>;
        })}</tbody>
      </table>
      {!rows.length && <p>No customer workspace memberships yet.</p>}
    </div>
    <dialog open={Boolean(draft)} onClose={() => setDraft(null)} style={{ width: "min(480px, calc(100vw - 32px))", border: "1px solid #cbd5e1", borderRadius: 16, padding: 26 }}>
      {draft && <form onSubmit={add} style={{ display: "grid", gap: 14 }}><h2 style={{ margin: 0 }}>Add Workspace Member</h2>
        <label>Workspace<select required style={input} value={draft.workspaceId} onChange={e => setDraft({ ...draft, workspaceId: e.target.value })}>{workspaces.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label>
        <label>Existing customer login email<input required type="email" style={input} value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} /></label>
        <label>Workspace role<select style={input} value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value as Membership["role"] })}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>The email must already have a customer login. Platform staff access remains separate.</p>
        {error && <p role="alert" style={{ margin: 0, color: "#991b1b" }}>{error}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}><button type="button" disabled={saving} onClick={() => { setDraft(null); setError(""); }}>Cancel</button><button className="primary-btn" disabled={saving || !workspaces.length}>{saving ? "Adding…" : "Add Member"}</button></div>
      </form>}
    </dialog>
  </>;
}
