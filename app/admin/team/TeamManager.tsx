"use client";

import { FormEvent, useEffect, useState } from "react";

type Role = "owner" | "admin" | "editor" | "viewer";
type Member = { user_id: string; email: string | null; role: Role; created_at: string };
type Invitation = { id: string; email: string; role: "admin" | "editor"; created_at: string; expires_at: string };
type Props = { role: Role };

const inputStyle = { width: "100%", padding: "11px 12px", border: "1px solid #d1d5db", borderRadius: 8, boxSizing: "border-box" as const };
const smallButton = { border: "1px solid #d1d5db", borderRadius: 8, background: "white", padding: "8px 11px", cursor: "pointer" };

export default function TeamManager({ role }: Props) {
  const owner = role === "owner";
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor">("editor");
  const [inviteUrl, setInviteUrl] = useState("");
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
      setInvitations(data.invitations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load the team.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function sendInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking("invite"); setError(""); setMessage(""); setInviteUrl("");
    try {
      const response = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create the invitation.");
      setInviteUrl(data.invitationUrl);
      setEmail("");
      setMessage(`Invitation created for ${data.email}. Copy the link below and send it to that email address.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create the invitation.");
    } finally { setWorking(""); }
  }

  async function changeRole(member: Member, nextRole: "admin" | "editor") {
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

  async function revokeInvitation(invitation: Invitation) {
    if (!window.confirm(`Revoke the invitation for ${invitation.email}?`)) return;
    setWorking(invitation.id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: invitation.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to revoke this invitation.");
      setMessage("Invitation revoked.");
      if (inviteUrl.includes(`/invite/${invitation.id}?`)) setInviteUrl("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to revoke this invitation.");
    } finally { setWorking(""); }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setMessage("Invitation link copied.");
    } catch {
      setError("Could not copy the link. Select and copy it from the field.");
    }
  }

  const cardStyle = { background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 } as const;
  const now = Date.now();

  return <div>
    {error && <div role="alert" style={{ ...cardStyle, color: "#991b1b", background: "#fef2f2", borderColor: "#fecaca" }}>{error}</div>}
    {message && <div role="status" aria-live="polite" style={{ ...cardStyle, color: "#065f46", background: "#ecfdf5", borderColor: "#a7f3d0" }}>{message}</div>}

    {owner && <section style={cardStyle}>
      <h2 style={{ marginTop: 0 }}>Invite a team member</h2>
      <p style={{ color: "#5b6472" }}>Invitations are tied to the invited email and expire after 7 days. The link is generated here for you to share with that person.</p>
      <form onSubmit={sendInvite} style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1fr) 160px auto", gap: 12, alignItems: "end" }}>
        <label>Email address<input style={inputStyle} type="email" required maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="teammate@company.com" /></label>
        <label>Role<select style={inputStyle} value={inviteRole} onChange={event => setInviteRole(event.target.value as "admin" | "editor")}><option value="editor">Editor</option><option value="admin">Admin</option></select></label>
        <button className="primary-btn" disabled={working === "invite"}>{working === "invite" ? "Creating…" : "Create invitation"}</button>
      </form>
      {inviteUrl && <div style={{ marginTop: 16 }}>
        <label htmlFor="invite-link">New invitation link</label>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <input id="invite-link" style={inputStyle} readOnly value={inviteUrl} onFocus={event => event.currentTarget.select()} />
          <button type="button" style={smallButton} onClick={copyInvite}>Copy link</button>
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
                value={member.role} onChange={event => void changeRole(member, event.target.value as "admin" | "editor")}
                style={{ ...inputStyle, minWidth: 110 }}>
                <option value="admin">Admin</option><option value="editor">Editor</option>
              </select> : member.role}
            </td>
            <td>{new Date(member.created_at).toLocaleDateString("en-LK")}</td>
            {owner && <td>{member.role !== "owner" && <button type="button" style={smallButton} disabled={working === member.user_id} onClick={() => void removeMember(member)}>Remove</button>}</td>}
          </tr>)}</tbody>
        </table>
      </div>}
    </section>

    {owner && <section style={cardStyle}>
      <h2 style={{ marginTop: 0 }}>Pending invitations</h2>
      {loading ? <p>Loading invitations…</p> : invitations.length === 0 ? <p>No pending invitations.</p> : <div style={{ overflowX: "auto" }}>
        <table className="admin-table" style={{ minWidth: 560, width: "100%" }}>
          <thead><tr><th>Email</th><th>Role</th><th>Expires</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{invitations.map(invitation => {
            const expired = new Date(invitation.expires_at).getTime() <= now;
            return <tr key={invitation.id}>
              <td>{invitation.email}</td><td>{invitation.role}</td>
              <td>{new Date(invitation.expires_at).toLocaleDateString("en-LK")}</td>
              <td>{expired ? "Expired" : "Waiting for acceptance"}</td>
              <td><button type="button" style={smallButton} disabled={working === invitation.id} onClick={() => void revokeInvitation(invitation)}>Revoke</button></td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
    </section>}
  </div>;
}
