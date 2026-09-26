"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Game = {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
};

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("spin");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  async function loadGames() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: memberships, error: membershipError } =
      await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id);

    if (
      membershipError ||
      !memberships ||
      memberships.length === 0
    ) {
      setError("No workspace membership found.");
      setLoading(false);
      return;
    }

    const workspaceId = memberships[0].workspace_id;

    const { data, error: gamesError } = await supabase
      .from("games")
      .select("id, name, slug, type, status")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (gamesError) {
      setError(gamesError.message);
    } else {
      setGames(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadGames();
  }, []);

  async function handleCreateGame(
    event: FormEvent<HTMLFormElement>
  ) {
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          type,
          description,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error || "Failed to create game."
        );
        setSaving(false);
        return;
      }

      setName("");
      setDescription("");
      setType("spin");
      setShowForm(false);

      await loadGames();
    } catch {
      setError("Unable to create game.");
    }

    setSaving(false);
  }

  return (
    <>
      <div className="admin-header">
        <div>
          <div className="eyebrow">GAME MANAGEMENT</div>

          <h1>Games</h1>

          <p>
            Create and manage the games available in your
            campaigns.
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() => {
            setShowForm(!showForm);
            setError("");
          }}
        >
          {showForm ? "Cancel" : "+ New Game"}
        </button>
      </div>

      {showForm && (
        <div className="admin-panel">
          <h2>Create New Game</h2>

          <form onSubmit={handleCreateGame}>
            <div style={{ marginBottom: "18px" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                Game Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="e.g. Singhagiri Spin & Win"
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "9px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                Game Type
              </label>

              <select
                value={type}
                onChange={(event) =>
                  setType(event.target.value)
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "9px",
                  boxSizing: "border-box",
                  background: "#ffffff",
                }}
              >
                {gameTypes.map((gameType) => (
                  <option
                    key={gameType.value}
                    value={gameType.value}
                  >
                    {gameType.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                Description
              </label>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Optional description"
                rows={4}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "9px",
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />
            </div>

            {error && (
              <div className="error-box">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="primary-btn"
              disabled={saving}
            >
              {saving ? "Creating..." : "Create Game"}
            </button>
          </form>
        </div>
      )}

      {!showForm && error && (
        <div className="error-box">
          {error}
        </div>
      )}

      <div className="admin-panel">
        {loading ? (
          <div className="empty">
            Loading games...
          </div>
        ) : games.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Slug</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {games.map((game) => (
                <tr key={game.id}>
                  <td>
                    <strong>{game.name}</strong>
                  </td>

                  <td>
                    <span className="tag">
                      {game.type}
                    </span>
                  </td>

                  <td>{game.slug}</td>

                  <td>
                    <span className="tag">
                      {game.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">
            No games have been created yet.
          </div>
        )}
      </div>
    </>
  );
}
