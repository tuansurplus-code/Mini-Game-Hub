"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Campaign = {
  id: string;
  name: string;
  slug: string;
  status: string;
  scheduling_mode: string;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

type GameRecord = {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  status: string;
  default_config: Record<string, unknown> | null;
};

type CampaignGame = {
  id: string;
  campaign_id: string;
  game_id: string;
  public_slug: string;
  status: string;
  display_order: number;
  appearance: Record<string, unknown> | null;
  rules: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  games: GameRecord | GameRecord[] | null;
};

type AvailableGame = {
  id: string;
  name: string;
  type: string;
  status: string;
};

type Props = {
  campaign: Campaign;
  campaignGames: CampaignGame[];
};

function utcToColomboDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function colomboDateTimeToUtc(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}:00+05:30`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function formatStatus(status: string) {
  switch (status) {
    case "draft":
      return "Draft";

    case "scheduled":
      return "Scheduled";

    case "active":
      return "Active";

    case "ended":
      return "Ended";

    case "archived":
      return "Archived";

    default:
      return status
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}

function formatGameType(type: string) {
  switch (type) {
    case "spin":
      return "Spin & Win";

    case "scratch":
      return "Scratch Card";

    case "pick-card":
      return "Pick a Card";

    case "slot":
      return "Slot";

    case "quiz":
      return "Quiz";

    case "lucky-draw":
      return "Lucky Draw";

    default:
      return type
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}

export default function CampaignEditForm({
  campaign,
  campaignGames,
}: Props) {
  const router = useRouter();

  const [name, setName] = useState(campaign.name);

  const [schedulingMode, setSchedulingMode] = useState<
    "manual" | "automatic"
  >(
    campaign.scheduling_mode === "automatic"
      ? "automatic"
      : "manual"
  );

  const [startsAt, setStartsAt] = useState(
    utcToColomboDateTimeLocal(campaign.starts_at)
  );

  const [endsAt, setEndsAt] = useState(
    utcToColomboDateTimeLocal(campaign.ends_at)
  );

  const [status, setStatus] = useState(campaign.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showAddGame, setShowAddGame] = useState(false);
  const [availableGames, setAvailableGames] = useState<
    AvailableGame[]
  >([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [loadingGames, setLoadingGames] = useState(false);
  const [addingGame, setAddingGame] = useState(false);
  const [gameError, setGameError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Campaign name is required.");
      return;
    }

    if (startsAt && endsAt) {
      const start = new Date(`${startsAt}:00+05:30`);
      const end = new Date(`${endsAt}:00+05:30`);

      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
      ) {
        setError("Please enter valid start and end dates.");
        return;
      }

      if (end <= start) {
        setError("End date must be after the start date.");
        return;
      }
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/campaigns/${campaign.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            starts_at: colomboDateTimeToUtc(
              startsAt || null
            ),
            ends_at: colomboDateTimeToUtc(
              endsAt || null
            ),
            status,
            scheduling_mode: schedulingMode,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error || "Failed to update campaign."
        );
        setSaving(false);
        return;
      }

      setSaving(false);
      router.refresh();
    } catch {
      setError("Unable to update campaign.");
      setSaving(false);
    }
  }

  async function openAddGame() {
    setShowAddGame(true);
    setGameError("");
    setSelectedGameId("");
    setLoadingGames(true);

    try {
      const response = await fetch(
        "/api/admin/campaign-games"
      );

      const result = await response.json();

      if (!response.ok) {
        setGameError(
          result.error || "Failed to load available games."
        );
        setLoadingGames(false);
        return;
      }

      const assignedGameIds = new Set(
        campaignGames.map((campaignGame) => campaignGame.game_id)
      );

      const games: AvailableGame[] = (
        result.games ?? []
      ).filter(
        (game: AvailableGame) =>
          !assignedGameIds.has(game.id)
      );

      setAvailableGames(games);

      if (games.length > 0) {
        setSelectedGameId(games[0].id);
      }
    } catch {
      setGameError("Unable to load available games.");
    }

    setLoadingGames(false);
  }

  function closeAddGame() {
    if (addingGame) {
      return;
    }

    setShowAddGame(false);
    setAvailableGames([]);
    setSelectedGameId("");
    setGameError("");
  }

  async function handleAddGame(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedGameId) {
      setGameError("Please select a game.");
      return;
    }

    setAddingGame(true);
    setGameError("");

    try {
      const response = await fetch(
        "/api/admin/campaign-games",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            campaign_id: campaign.id,
            game_id: selectedGameId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setGameError(
          result.error || "Failed to add game to campaign."
        );
        setAddingGame(false);
        return;
      }

      setAddingGame(false);
      setShowAddGame(false);
      setAvailableGames([]);
      setSelectedGameId("");
      setGameError("");

      router.refresh();
    } catch {
      setGameError(
        "Unable to add game to campaign."
      );
      setAddingGame(false);
    }
  }

  const automaticMode = schedulingMode === "automatic";

  return (
    <div>
      <form onSubmit={handleSubmit}>
        {error && (
          <div
            className="error-box"
            style={{ marginBottom: "16px" }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="campaign-name"
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: 600,
            }}
          >
            Campaign Name
          </label>

          <input
            id="campaign-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={saving}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "14px",
            }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="campaign-scheduling-mode"
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: 600,
            }}
          >
            Scheduling Mode
          </label>

          <select
            id="campaign-scheduling-mode"
            value={schedulingMode}
            onChange={(event) =>
              setSchedulingMode(
                event.target.value as
                  | "manual"
                  | "automatic"
              )
            }
            disabled={saving}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "14px",
              background: "#fff",
            }}
          >
            <option value="automatic">Automatic</option>
            <option value="manual">Manual</option>
          </select>

          <small
            style={{
              display: "block",
              marginTop: "6px",
              color: "#666",
            }}
          >
            Automatic mode controls the campaign status using
            the start and end dates.
          </small>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: 600,
            }}
          >
            Current Status
          </label>

          {automaticMode ? (
            <div
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                background: "#f7f7f7",
                color: "#555",
              }}
            >
              {formatStatus(status)}
            </div>
          ) : (
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
              disabled={saving}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                background: "#fff",
              }}
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
              <option value="archived">Archived</option>
            </select>
          )}

          {automaticMode && (
            <small
              style={{
                display: "block",
                marginTop: "6px",
                color: "#666",
              }}
            >
              Status is managed automatically from the
              campaign schedule.
            </small>
          )}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="campaign-start"
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: 600,
            }}
          >
            Start Date & Time
          </label>

          <input
            id="campaign-start"
            type="datetime-local"
            value={startsAt}
            onChange={(event) =>
              setStartsAt(event.target.value)
            }
            disabled={saving}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "14px",
            }}
          />

          <small
            style={{
              display: "block",
              marginTop: "6px",
              color: "#666",
            }}
          >
            Time is shown and edited in Sri Lanka time.
          </small>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="campaign-end"
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: 600,
            }}
          >
            End Date & Time
          </label>

          <input
            id="campaign-end"
            type="datetime-local"
            value={endsAt}
            onChange={(event) =>
              setEndsAt(event.target.value)
            }
            disabled={saving}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "14px",
            }}
          />

          <small
            style={{
              display: "block",
              marginTop: "6px",
              color: "#666",
            }}
          >
            Time is shown and edited in Sri Lanka time.
          </small>
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
            onClick={() => router.back()}
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
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Campaign Games */}
      <section
        style={{
          marginTop: "32px",
          paddingTop: "24px",
          borderTop: "1px solid #e5e5e5",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 700,
              }}
            >
              Games
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                color: "#666",
                fontSize: "14px",
              }}
            >
              Games assigned to this campaign.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddGame}
            disabled={loadingGames}
            style={{
              padding: "10px 14px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            + Add Game
          </button>
        </div>

        {campaignGames.length === 0 ? (
          <div
            style={{
              padding: "24px",
              border: "1px dashed #ccc",
              borderRadius: "10px",
              textAlign: "center",
              color: "#666",
              background: "#fafafa",
            }}
          >
            No games have been added to this campaign yet.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {campaignGames.map((campaignGame) => {
              const game = Array.isArray(campaignGame.games)
                ? campaignGame.games[0]
                : campaignGame.games;

              if (!game) {
                return (
                  <div
                    key={campaignGame.id}
                    style={{
                      padding: "16px",
                      border: "1px solid #eee",
                      borderRadius: "10px",
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        marginBottom: "4px",
                      }}
                    >
                      Game unavailable
                    </div>

                    <div
                      style={{
                        fontSize: "13px",
                        color: "#777",
                      }}
                    >
                      The assigned game could not be loaded.
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={campaignGame.id}
                  style={{
                    padding: "18px",
                    border: "1px solid #e5e5e5",
                    borderRadius: "10px",
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "16px",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "17px",
                            fontWeight: 700,
                          }}
                        >
                          {game.name}
                        </h3>

                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "999px",
                            background: "#f3f3f3",
                            color: "#555",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          {formatGameType(game.type)}
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop: "8px",
                          fontSize: "14px",
                          color: "#666",
                        }}
                      >
                        Status:{" "}
                        <strong
                          style={{
                            color: "#333",
                          }}
                        >
                          {formatStatus(campaignGame.status)}
                        </strong>
                      </div>

                      <div
                        style={{
                          marginTop: "5px",
                          fontSize: "14px",
                          color: "#666",
                          wordBreak: "break-word",
                        }}
                      >
                        Public URL:{" "}
                        <span
                          style={{
                            color: "#333",
                            fontFamily:
                              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                          }}
                        >
                          /play/{campaignGame.public_slug}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexShrink: 0,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          alert(
                            "Game configuration will be available in the next step."
                          );
                        }}
                        style={{
                          padding: "9px 12px",
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          background: "#fff",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Configure
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          alert(
                            "Game publishing will be available in a later step."
                          );
                        }}
                        style={{
                          padding: "9px 12px",
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          background: "#fff",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Publish
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add Game Modal */}
      {showAddGame && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-game-title"
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
              <div>
                <h2
                  id="add-game-title"
                  style={{ margin: 0 }}
                >
                  Add Game
                </h2>

                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#666",
                    fontSize: "14px",
                  }}
                >
                  Add an existing game to this campaign.
                </p>
              </div>

              <button
                type="button"
                onClick={closeAddGame}
                disabled={addingGame}
                aria-label="Close"
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "24px",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {gameError && (
              <div
                className="error-box"
                style={{ marginTop: "16px" }}
              >
                {gameError}
              </div>
            )}

            {loadingGames ? (
              <div
                className="empty"
                style={{ marginTop: "16px" }}
              >
                Loading available games...
              </div>
            ) : availableGames.length === 0 ? (
              <div
                style={{
                  marginTop: "16px",
                  padding: "20px",
                  border: "1px dashed #ccc",
                  borderRadius: "10px",
                  background: "#fafafa",
                  color: "#666",
                  textAlign: "center",
                }}
              >
                There are no available games to add.
              </div>
            ) : (
              <form
                onSubmit={handleAddGame}
                style={{ marginTop: "20px" }}
              >
                <div style={{ marginBottom: "20px" }}>
                  <label
                    htmlFor="campaign-game"
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: 600,
                    }}
                  >
                    Select Game
                  </label>

                  <select
                    id="campaign-game"
                    value={selectedGameId}
                    onChange={(event) =>
                      setSelectedGameId(
                        event.target.value
                      )
                    }
                    disabled={addingGame}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      fontSize: "14px",
                      background: "#fff",
                    }}
                  >
                    <option value="">
                      Select a game
                    </option>

                    {availableGames.map((game) => (
                      <option
                        key={game.id}
                        value={game.id}
                      >
                        {game.name} —{" "}
                        {formatGameType(game.type)}
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
                    onClick={closeAddGame}
                    disabled={addingGame}
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
                    disabled={
                      addingGame || !selectedGameId
                    }
                  >
                    {addingGame
                      ? "Adding..."
                      : "Add Game"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
