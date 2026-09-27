"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type CampaignGame = {
  id: string;
  public_slug: string;
  campaigns:
    | {
        id: string;
        name: string;
        workspace_id: string;
      }
    | {
        id: string;
        name: string;
        workspace_id: string;
      }[]
    | null;
  games:
    | {
        id: string;
        name: string;
        type: string;
      }
    | {
        id: string;
        name: string;
        type: string;
      }[]
    | null;
};

function first<T>(
  value: T | T[] | null | undefined
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value ?? null;
}

export default function PrizeForm() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [campaignGames, setCampaignGames] = useState<
    CampaignGame[]
  >([]);

  const [campaignGameId, setCampaignGameId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [weight, setWeight] = useState("1");
  const [inventory, setInventory] = useState("");
  const [active, setActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function openForm() {
    setOpen(true);
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/prizes"
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Failed to load campaign games."
        );
        setLoading(false);
        return;
      }

      setCampaignGames(
        result.campaignGames ?? []
      );

      if (result.campaignGames?.length > 0) {
        setCampaignGameId(
          result.campaignGames[0].id
        );
      }
    } catch {
      setError(
        "Unable to load campaign games."
      );
    }

    setLoading(false);
  }

  function closeForm() {
    if (saving) return;

    setOpen(false);
    setError("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !campaignGameId ||
      !name.trim()
    ) {
      setError(
        "Please select a campaign game and enter a prize name."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/prizes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            campaign_game_id:
              campaignGameId,
            name,
            description,
            image_url: imageUrl,
            weight,
            inventory,
            active,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Failed to create prize."
        );
        setSaving(false);
        return;
      }

      setOpen(false);
      setSaving(false);

      setCampaignGameId("");
      setName("");
      setDescription("");
      setImageUrl("");
      setWeight("1");
      setInventory("");
      setActive(true);

      router.refresh();
    } catch {
      setError(
        "Unable to create prize."
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
        + New Prize
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.45)",
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
              maxWidth: "560px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <h2
                style={{ margin: 0 }}
              >
                Create New Prize
              </h2>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                style={{
                  border: "none",
                  background:
                    "transparent",
                  fontSize: "24px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <p
              style={{
                marginBottom: "20px",
              }}
            >
              Add a reward to a
              campaign game.
            </p>

            {error && (
              <div
                className="error-box"
                style={{
                  marginBottom: "16px",
                }}
              >
                {error}
              </div>
            )}

            {loading ? (
              <div className="empty">
                Loading campaign
                games...
              </div>
            ) : campaignGames.length ===
              0 ? (
              <div className="empty">
                No campaign games are
                available. Assign a game
                to a campaign first.
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
              >
                <div
                  style={{
                    marginBottom: "16px",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: 600,
                    }}
                  >
                    Campaign Game
                  </label>

                  <select
                    value={
                      campaignGameId
                    }
                    onChange={(event) =>
                      setCampaignGameId(
                        event.target
                          .value
                      )
                    }
                    disabled={saving}
                    style={{
                      width: "100%",
                      padding:
                        "10px 12px",
                      border:
                        "1px solid #ddd",
                      borderRadius:
                        "8px",
                      fontSize:
                        "14px",
                    }}
                  >
                    <option value="">
                      Select campaign
                      game
                    </option>

                    {campaignGames.map(
                      (item) => {
                        const campaign =
                          first(
                            item.campaigns
                          );

                        const game =
                          first(
                            item.games
                          );

                        return (
                          <option
                            key={
                              item.id
                            }
                            value={
                              item.id
                            }
                          >
                            {campaign?.name ??
                              "Campaign"}{" "}
                            —{" "}
                            {game?.name ??
                              "Game"}
                          </option>
                        );
                      }
                    )}
                  </select>
                </div>

                <div
                  style={{
                    marginBottom: "16px",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: 600,
                    }}
                  >
                    Prize Name
                  </label>

                  <input
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target
                          .value
                      )
                    }
                    placeholder="Example: Rs. 5,000 Voucher"
                    disabled={saving}
                    style={{
                      width: "100%",
                      padding:
                        "10px 12px",
                      border:
                        "1px solid #ddd",
                      borderRadius:
                        "8px",
                      fontSize:
                        "14px",
                    }}
                  />
                </div>

                <div
                  style={{
                    marginBottom: "16px",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: 600,
                    }}
                  >
                    Description
                  </label>

                  <textarea
                    value={
                      description
                    }
                    onChange={(event) =>
                      setDescription(
                        event.target
                          .value
                      )
                    }
                    placeholder="Prize details"
                    rows={3}
                    disabled={saving}
                    style={{
                      width: "100%",
                      padding:
                        "10px 12px",
                      border:
                        "1px solid #ddd",
                      borderRadius:
                        "8px",
                      fontSize:
                        "14px",
                      resize:
                        "vertical",
                    }}
                  />
                </div>

                <div
                  style={{
                    marginBottom: "16px",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: 600,
                    }}
                  >
                    Image URL
                  </label>

                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(event) =>
                      setImageUrl(
                        event.target
                          .value
                      )
                    }
                    placeholder="https://..."
                    disabled={saving}
                    style={{
                      width: "100%",
                      padding:
                        "10px 12px",
                      border:
                        "1px solid #ddd",
                      borderRadius:
                        "8px",
                      fontSize:
                        "14px",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap: "12px",
                    marginBottom:
                      "20px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display:
                          "block",
                        marginBottom:
                          "6px",
                        fontWeight:
                          600,
                      }}
                    >
                      Weight
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={weight}
                      onChange={(
                        event
                      ) =>
                        setWeight(
                          event.target
                            .value
                        )
                      }
                      disabled={
                        saving
                      }
                      style={{
                        width:
                          "100%",
                        padding:
                          "10px 12px",
                        border:
                          "1px solid #ddd",
                        borderRadius:
                          "8px",
                        fontSize:
                          "14px",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display:
                          "block",
                        marginBottom:
                          "6px",
                        fontWeight:
                          600,
                      }}
                    >
                      Inventory
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={
                        inventory
                      }
                      onChange={(
                        event
                      ) =>
                        setInventory(
                          event.target
                            .value
                        )
                      }
                      placeholder="Unlimited"
                      disabled={
                        saving
                      }
                      style={{
                        width:
                          "100%",
                        padding:
                          "10px 12px",
                        border:
                          "1px solid #ddd",
                        borderRadius:
                          "8px",
                        fontSize:
                          "14px",
                      }}
                    />
                  </div>
                </div>

                <label
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems:
                      "center",
                    marginBottom:
                      "20px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(
                      event
                    ) =>
                      setActive(
                        event.target
                          .checked
                      )
                    }
                    disabled={saving}
                  />

                  Active prize
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent:
                      "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={
                      closeForm
                    }
                    disabled={
                      saving
                    }
                    style={{
                      padding:
                        "10px 16px",
                      border:
                        "1px solid #ddd",
                      borderRadius:
                        "8px",
                      background:
                        "#fff",
                      cursor:
                        "pointer",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={
                      saving
                    }
                  >
                    {saving
                      ? "Creating..."
                      : "Create Prize"}
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
