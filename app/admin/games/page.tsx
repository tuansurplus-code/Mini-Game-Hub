"use client";

import { FormEvent, useEffect, useState } from "react";

type Role = "owner" | "admin" | "editor" | "viewer";
type Game = { id: string; name: string; slug: string; type: string; status: string };
const gameTypes = [
  { value: "spin", label: "Spin & Win" },
  { value: "scratch", label: "Scratch Card" },
  { value: "pick-card", label: "Pick a Card" },
  { value: "slot", label: "Slot Machine" },
  { value: "quiz", label: "Quiz" },
  { value: "lucky-draw", label: "Lucky Draw" },
];

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [role, setRole] = useState<Role>("viewer");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("spin");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const canEdit = role !== "viewer";

  async function loadGames() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/games", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok) throw new Error(data.error || "Unable to load games.");
      setRole(data.role);
      setGames(data.games ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load games.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadGames(); }, []);

  async function handleCreateGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Please enter a game name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, description }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create game.");
      setName("");
      setDescription("");
      setType("spin");
      setShowForm(false);
      await loadGames();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create game.");
    } finally {
      setSaving(false);
    }
  }

  async function removeGame(game: Game) {
    if (!window.confirm(`Delete "${game.name}" permanently?\n\nAssigned games must first be removed from all campaigns.`)) return;
    setDeleting(game.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/games?id=${encodeURIComponent(game.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete game.");
      await loadGames();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete game.");
    } finally {
      setDeleting(null);
    }
  }

  return <>
    <div className="admin-header">
      <div>
        <div className="eyebrow">GAME MANAGEMENT</div>
        <h1>Games</h1>
        <p>Draft = not assigned, Assigned = added to a campaign, Live = assigned to an active campaign.</p>
      </div>
      {canEdit && <button className="primary-btn" onClick={() => { setShowForm(!showForm); setError(""); }}>{showForm ? "Cancel" : "+ New Game"}</button>}
    </div>

    {canEdit && showForm && <div className="admin-panel">
      <h2>Create New Game</h2>
      <form onSubmit={handleCreateGame}>
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>Game Name</label>
          <input value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Singhagiri Spin & Win" required style={{ width: "100%", padding: 12, border: "1px solid #d1d5db", borderRadius: 9, boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>Game Type</label>
          <select value={type} onChange={event => setType(event.target.value)} style={{ width: "100%", padding: 12, border: "1px solid #d1d5db", borderRadius: 9, background: "#fff" }}>
            {gameTypes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>Description</label>
          <textarea value={description} onChange={event => setDescription(event.target.value)} rows={4} placeholder="Optional description" style={{ width: "100%", padding: 12, border: "1px solid #d1d5db", borderRadius: 9, boxSizing: "border-box" }} />
        </div>
        {error && <div className="error-box">{error}</div>}
        <button className="primary-btn" disabled={saving}>{saving ? "Creating..." : "Create Game"}</button>
      </form>
    </div>}

    {!showForm && error && <div className="error-box">{error}</div>}
    <div className="admin-panel">
      {loading ? <div className="empty">Loading games...</div> : games.length ? <table>
        <thead><tr><th>Name</th><th>Type</th><th>Slug</th><th>Status</th>{canEdit && <th>Action</th>}</tr></thead>
        <tbody>{games.map(game => <tr key={game.id}>
          <td><strong>{game.name}</strong></td>
          <td><span className="tag">{game.type}</span></td>
          <td>{game.slug}</td>
          <td><span className="tag" style={{ textTransform: "capitalize" }}>{game.status}</span></td>
          {canEdit && <td><button type="button" disabled={deleting === game.id} onClick={() => void removeGame(game)} style={{ padding: "7px 10px", border: "1px solid #fecaca", borderRadius: 7, background: "#fff", color: "#b91c1c", fontWeight: 700, cursor: "pointer" }}>{deleting === game.id ? "Deleting..." : "Delete"}</button></td>}
        </tr>)}</tbody>
      </table> : <div className="empty">No games have been created yet.</div>}
    </div>
  </>;
}
