"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Campaign = {
  id: string;
  name: string;
};

type Game = {
  id: string;
  name: string;
  type: string;
  status: string;
};

export default function CampaignGameForm() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [games, setGames] = useState<Game[]>([]);

  const [campaignId, setCampaignId] = useState("");
  const [gameId, setGameId] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function openForm() {
    setOpen(true);
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/campaign-games"
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Failed to load campaigns and games."
        );
        setLoading(false);
        return;
      }

      setCampaigns(result.campaigns ?? []);
      setGames(result.games ?? []);

      if (result.campaigns?.length > 0) {
        setCampaignId(result.campaigns[0].id);
      }

      if (result.games?.length > 0) {
        setGameId(result.games[0].id);
      }
    } catch {
      setError(
        "Unable to load campaigns and games."
      );
    }

    setLoading(false);
  }

  function closeForm() {
    if (saving) return;

    setOpen(false);
    setError("");
    setCampaignId("");
    setGameId("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!campaignId || !gameId) {
      setError(
        "Please select both a campaign and a game."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/campaign-games",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            campaign_id: campaignId,
            game_id: gameId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Failed to assign game to campaign."
        );
        setSaving(false);
        return;
      }

      setSaving(false);
      setOpen(false);
      setCampaignId("");
      setGameId("");
      setError("");

      router.refresh();
    } catch {
      setError(
        "Unable to assign game to campaign."
      );
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="primary-btn"
        onClick={openForm}
      >
        + Assign Game
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1000,
          }}
        >
          <div
            className="admin-panel"
            style={{
              width: "100%",
              maxWidth: "520px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <h2 style={{ margin: 0 }}>
                Assign Game to Campaign
              </h2>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "24px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <p style={{ marginBottom: "20px" }}>
              Select a campaign and an existing game.
            </p>

            {error && (
              <div
                className="error-box"
                style={{ marginBottom: "16px" }}
              >
                {error}
              </div>
            )}

            {loading ? (
              <div className="empty">
                Loading campaigns and games...
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "16px" }}>
                  <label
                    htmlFor="campaign"
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: 600,
                    }}
                  >
                    Campaign
                  </label>

                  <select
                    id="campaign"
                    value={campaignId}
                    onChange={(event) =>
                      setCampaignId(
                        event.target.value
                      )
                    }
                    disabled={saving}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      fontSize: "14px",
                    }}
                  >
                    <option value="">
                      Select campaign
                    </option>

                    {campaigns.map((campaign) => (
                      <option
                        key={campaign.id}
                        value={campaign.id}
                      >
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    htmlFor="game"
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: 600,
                    }}
                  >
                    Game
                  </label>

                  <select
                    id="game"
                    value={gameId}
                    onChange={(event) =>
                      setGameId(event.target.value)
                    }
                    disabled={saving}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      fontSize: "14px",
                    }}
                  >
                    <option value="">
                      Select game
                    </option>

                    {games.map((game) => (
                      <option
                        key={game.id}
                        value={game.id}
                      >
                        {game.name} — {game.type}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    style={{
                      padding: "10px 16px",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={saving}
                  >
                    {saving
                      ? "Assigning..."
                      : "Assign Game"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
