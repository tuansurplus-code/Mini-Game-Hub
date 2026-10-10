"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { platformRoleLabels, PlatformRole } from "../../../lib/platform-roles";

type Staff = { user_id: string; email: string; full_name: string; contact_number: string; role: PlatformRole; active: boolean; password_change_required: boolean };
type Audit = { id: string; actor_id: string; target_id: string; action: string; created_at: string; before_state: { role?: PlatformRole; active?: boolean } | null; after_state: { role: PlatformRole; active: boolean } };
type Form = { userId?: string; email: string; fullName: string; contactNumber: string; role: PlatformRole; active: boolean };
const emptyForm: Form = { email: "", fullName: "", contactNumber: "", role: "support", active: true };
const inputStyle = { width: "100%", boxSizing: "border-box" as const, padding: 11, borderRadius: 8, border: "1px solid #cbd5e1", background: "white", color: "#111827" };

export default function StaffManager() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/saas-admin/staff", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load staff.");
    setStaff(data.staff); setAudit(data.audit); setCanManage(data.canManage); setCurrentUserId(data.currentUserId);
  }, []);
  useEffect(() => { load().catch(e => setError(e.message)).finally(() => setLoading(false)); }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/saas-admin/staff", { method: form.userId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save staff.");
      if (data.temporaryPassword) setCredential({ email: form.email, password: data.temporaryPassword });
      setForm(null); setMessage("Staff access saved.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save staff."); }
    finally { setSaving(false); }
  }
  async function removeStaff(person: Staff) {
    if (!window.confirm(`Remove ${person.email} from platform staff? Their login and any customer workspace access will remain.`)) return;
    setError(""); setMessage("");
    const response = await fetch("/api/saas-admin/staff", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: person.user_id }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Unable to remove platform staff."); return; }
    setStaff(current => current.filter(row => row.user_id !== person.user_id)); setMessage(`${person.email} no longer has platform staff access. Their customer access was not changed.`);
    await load();
  }
  const name = (id: string) => staff.find(s => s.user_id === id)?.email || "Staff account";
  const lastOwner = form?.userId && staff.find(s => s.user_id === form.userId)?.role === "owner" && staff.find(s => s.user_id === form.userId)?.active && staff.filter(s => s.role === "owner" && s.active).length === 1;

  return <section>
    <div className="admin-header"><div><div className="eyebrow">PLATFORM ACCESS</div><h1>Users & Roles</h1><p>Manage the people who operate Mini-Game Hub.</p></div>{canManage && <button className="primary-btn" onClick={() => { setError(""); setForm({ ...emptyForm }); }}>Create Staff Account</button>}</div>
    {!form && error && <p role="alert" className="admin-panel" style={{ color: "#b91c1c" }}>{error}</p>}
    {message && <p role="status">{message}</p>}
    {credential && <div className="admin-panel" style={{ border: "2px solid #2563eb", marginBottom: 20 }}>
      <h2>Account created — save these details</h2><p><b>Email:</b> {credential.email}</p><p><b>Temporary password:</b> <code style={{ overflowWrap: "anywhere" }}>{credential.password}</code></p>
      <p>Share these details securely. The password is shown only here and must be changed on first sign-in at <b>/saas-login</b>. No email has been sent.</p>
      <button type="button" onClick={() => setCredential(null)}>I have saved the details</button>
    </div>}
    <div className="admin-panel" style={{ overflowX: "auto" }}>
      <h2>Platform staff</h2>{loading ? <p>Loading staff…</p> : <>
        {!canManage && <p>You can view staff. Only Super Admins can create accounts or change access.</p>}
        <table className="admin-table"><thead><tr><th>Name / Email</th><th>Contact number</th><th>Role</th><th>Status</th>{canManage && <th>Action</th>}</tr></thead><tbody>{staff.map(s => <tr key={s.user_id}>
          <td><b>{s.full_name || "Name not set"}</b><br />{s.email}</td><td>{s.contact_number || "Not set"}</td><td>{platformRoleLabels[s.role]}</td><td>{s.active ? "Active" : "Inactive"}{s.password_change_required && <div style={{ fontSize: 12 }}>Password setup pending</div>}</td>
          {canManage && <td><button onClick={() => { setError(""); setForm({ userId: s.user_id, email: s.email, fullName: s.full_name, contactNumber: s.contact_number, role: s.role, active: s.active }); }}>Edit Access</button>{s.user_id !== currentUserId && <button style={{ marginLeft: 8 }} onClick={() => void removeStaff(s)}>Remove Access</button>}</td>}
        </tr>)}</tbody></table>
      </>}
    </div>
    <div className="admin-panel" style={{ marginTop: 20, overflowX: "auto" }}><h2>Role permissions</h2><table className="admin-table"><thead><tr><th>Role</th><th>Access</th></tr></thead><tbody>
      <tr><td>Super Admin</td><td>All available platform features, including creating staff and editing roles.</td></tr>
      <tr><td>Admin</td><td>All available platform features except staff creation and access changes.</td></tr>
      <tr><td>Operator</td><td>Approve or reject subscriptions. View other platform sections.</td></tr>
    </tbody></table></div>
    <div className="admin-panel" style={{ marginTop: 20, overflowX: "auto" }}><h2>Recent staff access changes</h2>{audit.length === 0 ? <p>No staff changes recorded yet.</p> : <table className="admin-table"><thead><tr><th>When</th><th>Changed by</th><th>Account</th><th>Change</th></tr></thead><tbody>{audit.map(a => <tr key={a.id}><td>{new Date(a.created_at).toLocaleString()}</td><td>{name(a.actor_id)}</td><td>{name(a.target_id)}</td><td>{a.action === "delete" ? "Removed platform access" : a.action === "create" ? "Created" : "Updated"}{a.action !== "delete" && <>: {a.before_state?.role ? `${platformRoleLabels[a.before_state.role]} → ` : ""}{platformRoleLabels[a.after_state.role]} · {a.after_state.active ? "Active" : "Inactive"}</>}</td></tr>)}</tbody></table>}</div>
    {form && <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setForm(null); }} style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 20, background: "rgba(0,0,0,.58)" }}>
      <section role="dialog" aria-modal="true" aria-labelledby="staff-dialog-title" className="admin-panel" style={{ width: "min(480px, 100%)", maxHeight: "calc(100vh - 40px)", overflowY: "auto", border: "1px solid #cbd5e1", borderRadius: 16, padding: 28, boxShadow: "0 24px 80px rgba(0,0,0,.35)" }}>
      <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
        <h2 id="staff-dialog-title" style={{ margin: 0 }}>{form.userId ? "Edit Staff Access" : "Create Staff Account"}</h2>
        {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
        <label>Full name<input autoFocus required maxLength={120} style={inputStyle} value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></label>
        <label>Email<input type="email" required maxLength={254} disabled={Boolean(form.userId)} style={inputStyle} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
        <label>Contact number<input type="tel" required minLength={7} maxLength={25} style={inputStyle} value={form.contactNumber} onChange={e => setForm({ ...form, contactNumber: e.target.value })} /></label>
        <label>Role<select disabled={Boolean(lastOwner)} style={inputStyle} value={form.role} onChange={e => setForm({ ...form, role: e.target.value as PlatformRole })}>{Object.entries(platformRoleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {form.userId && <label><input type="checkbox" disabled={Boolean(lastOwner)} checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active platform access</label>}
        {lastOwner && <p>The last active Super Admin must remain active with this role. Add another Super Admin before changing this access.</p>}
        {form.role === "owner" && !lastOwner && <p>This role grants full platform control, including management of other staff.</p>}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}><button type="button" disabled={saving} onClick={() => setForm(null)}>Cancel</button><button className="primary-btn" disabled={saving}>{saving ? "Saving…" : form.userId ? "Save Changes" : "Create Account"}</button></div>
      </form>
      </section>
    </div>}
  </section>;
}
