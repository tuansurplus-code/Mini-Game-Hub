"use client";

import { FormEvent, useEffect, useState } from "react";

type Role = "owner" | "admin" | "editor" | "viewer";
type Member = { user_id: string; email: string | null; role: Role; created_at: string };
type Props = { role: Role };

const inputStyle = { width: "100%", padding: "11px 12px", border: "1px solid #d1d5db", borderRadius: 8, boxSizing: "border-box" as const };
const smallButton = { border: "1px solid #d1d5db", borderRadius: 8, background: "white", padding: "8px 11px", cursor: "pointer" };

export default function TeamManager({ role }: Props) {
  const owner = role === "owner";
  const [members, setMembers] = useState<Member[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [createdAccount, setCreatedAccount] = useState<{ email: string; role: string; password: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/team", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load the team.");
      setMembers(data.members ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load the team.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking("create");
    setError("");
    setMessage("");
    setCreatedAccount(null);
    try {
      const response = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, role: memberRole }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create the account.");
      setCreatedAccount(typeof data.temporaryPassword === "string"
        ? { email: data.email, role: data.role, password: data.temporaryPassword }
        : null);
      setMessage(data.existingAccount
        ? `Existing account ${data.email} was added. They can sign in with their current password.`
        : `Account created for ${data.email}. Share the temporary password privately; the member must change it at first sign-in.`);
      setFullName("");
      setEmail("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create the account.");
    } finally {
      setWorking("");
    }
  }

  async function changeRole(member: Member, nextRole: "admin" | "editor" | "viewer") {
    if (member.role === nextRole) return;
    setWorking(member.user_id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.user_id, role: nextRole }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update this role.");
      setMessage(`Updated ${member.email || "team member"} to ${nextRole}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update this role.");
    } finally { setWorking(""); }
  }

  async function removeMember(member: Member) {
    if (!window.confirm(`Remove ${member.email || "this member"} from the workspace?`)) return;
    setWorking(member.user_id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.user_id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to remove this member.");
      setMessage("Team member removed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove this member.");
    } finally { setWorking(""); }
  }

  async function copyTemporaryPassword() {
    if (!createdAccount) return;
    try {
      await navigator.clipboard.writeText(createdAccount.password);
      setMessage("Temporary password copied. Share it through a private channel.");
    } catch {
      setError("Could not copy the password. Select and copy it from the field.");
    }
  }

  const cardStyle = { background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 } as const;

  return <div>
    {error && <div role="alert" style={{ ...cardStyle, color: "#991b1b", background: "#fef2f2", borderColor: "#fecaca" }}>{error}</div>}
    {message && <div role="status" aria-live="polite" style={{ ...cardStyle, color: "#065f46", background: "#ecfdf5", borderColor: "#a7f3d0" }}>{message}</div>}

    {owner && <section style={cardStyle}>
      <h2 style={{ marginTop: 0 }}>Create a team account</h2>
      <p style={{ color: "#5b6472" }}>The account is added to this workspace immediately. Confirm the person’s email address first. A temporary password will appear once, and the member must replace it at first sign-in.</p>
      <form onSubmit={createAccount} style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1fr) minmax(220px, 1.2fr) 150px auto", gap: 12, alignItems: "end" }}>
        <label>Full name<input style={inputStyle} type="text" maxLength={120} autoComplete="name" value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Team member" /></label>
        <label>Email address<input style={inputStyle} type="email" required maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="teammate@company.com" /></label>
        <label>Role<select style={inputStyle} value={memberRole} onChange={event => setMemberRole(event.target.value as "admin" | "editor" | "viewer")}><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Admin</option></select></label>
        <button className="primary-btn" disabled={working === "create"}>{working === "create" ? "Creating…" : "Create account"}</button>
      </form>
      {createdAccount && <div style={{ marginTop: 18, padding: 16, borderRadius: 10, border: "1px solid #fcd34d", background: "#fffbeb" }}>
        <strong>Temporary password for {createdAccount.email}</strong>
        <p style={{ margin: "6px 0 10px", color: "#5b6472" }}>Copy it now and share it privately. It will disappear if you leave or refresh this page.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input aria-label="Temporary password" style={inputStyle} readOnly value={createdAccount.password} onFocus={event => event.currentTarget.select()} />
          <button type="button" style={smallButton} onClick={() => void copyTemporaryPassword()}>Copy password</button>
        </div>
      </div>}
    </section>}

    <section style={cardStyle}>
      <h2 style={{ marginTop: 0 }}>Members</h2>
      {loading ? <p>Loading members…</p> : members.length === 0 ? <p>No members found.</p> : <div style={{ overflowX: "auto" }}>
        <table className="admin-table" style={{ minWidth: 540, width: "100%" }}>
          <thead><tr><th>Member</th><th>Role</th><th>Joined</th>{owner && <th>Actions</th>}</tr></thead>
          <tbody>{members.map(member => <tr key={member.user_id}>
            <td>{member.email || member.user_id}</td>
            <td>{member.role === "owner" ? <strong>Owner</strong> : owner ?
              <select aria-label={`Role for ${member.email || member.user_id}`} disabled={working === member.user_id}
                value={member.role} onChange={event => void changeRole(member, event.target.value as "admin" | "editor" | "viewer")}
                style={{ ...inputStyle, minWidth: 110 }}>
                <option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Admin</option>
              </select> : member.role}
            </td>
            <td>{new Date(member.created_at).toLocaleDateString("en-LK")}</td>
            {owner && <td>{member.role !== "owner" && <button type="button" style={smallButton} disabled={working === member.user_id} onClick={() => void removeMember(member)}>Remove</button>}</td>}
          </tr>)}</tbody>
        </table>
      </div>}
    </section>
  </div>;
}
