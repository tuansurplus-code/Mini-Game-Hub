"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type GameRecord = {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  status: string;
  default_config: Record<string, unknown> | null;
};

type CampaignRecord = {
  id: string;
  name: string;
  slug: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
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
  campaigns: CampaignRecord | CampaignRecord[] | null;
  games: GameRecord | GameRecord[] | null;
};

type AppearanceSettings = {
  title: string;
  subtitle: string;
  button_text: string;
  page_background_color: string;
  button_color: string;
  button_text_color: string;
};

const defaultAppearance: AppearanceSettings = {
  title: "SPIN & WIN",
  subtitle: "Spin daily and win exciting rewards!",
  button_text: "SPIN NOW",
  page_background_color: "#ffffff",
  button_color: "#e31b23",
  button_text_color: "#ffffff",
};

function getSingleRecord<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getAppearanceSettings(
  appearance: Record<string, unknown> | null
): AppearanceSettings {
  return {
    title:
      typeof appearance?.title === "string"
        ? appearance.title
        : defaultAppearance.title,

    subtitle:
      typeof appearance?.subtitle === "string"
        ? appearance.subtitle
        : defaultAppearance.subtitle,

    button_text:
      typeof appearance?.button_text === "string"
        ? appearance.button_text
        : defaultAppearance.button_text,

    page_background_color:
      typeof appearance?.page_background_color ===
      "string"
        ? appearance.page_background_color
        : defaultAppearance.page_background_color,

    button_color:
      typeof appearance?.button_color === "string"
        ? appearance.button_color
        : defaultAppearance.button_color,

    button_text_color:
      typeof appearance?.button_text_color === "string"
        ? appearance.button_text_color
        : defaultAppearance.button_text_color,
  };
}

function buildAppearance(
  settings: AppearanceSettings
): Record<string, unknown> {
  return {
    title: settings.title,
    subtitle: settings.subtitle,
    button_text: settings.button_text,
    page_background_color:
      settings.page_background_color,
    button_color: settings.button_color,
    button_text_color: settings.button_text_color,
  };
}

function formatRules(
  value: Record<string, unknown> | null
): string {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseRules(
  value: string
): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error();
    }

    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(
      "Rules must contain a valid JSON object."
    );
  }
}

export default function CampaignGameConfigurationPage() {
  const params = useParams();
  const router = useRouter();

  const campaignGameId =
    typeof params.id === "string"
      ? params.id
      : "";

  const [campaignGame, setCampaignGame] =
    useState<CampaignGame | null>(null);

  const [appearance, setAppearance] =
    useState<AppearanceSettings>(
      defaultAppearance
    );

  const [rules, setRules] = useState("{}");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadConfiguration() {
    if (!campaignGameId) {
      setError("Campaign game ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/campaign-games/${campaignGameId}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Failed to load game configuration."
        );
        setLoading(false);
        return;
      }

      const loadedCampaignGame =
        result.campaignGame as CampaignGame;

      setCampaignGame(loadedCampaignGame);

      setAppearance(
        getAppearanceSettings(
          loadedCampaignGame.appearance
        )
      );

      setRules(
        formatRules(loadedCampaignGame.rules)
      );
    } catch {
      setError(
        "Unable to load game configuration."
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadConfiguration();
  }, [campaignGameId]);

  function updateAppearance(
    field: keyof AppearanceSettings,
    value: string
  ) {
    setAppearance((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    let parsedRules: Record<string, unknown>;

    try {
      parsedRules = parseRules(rules);
    } catch (rulesError) {
      setError(
        rulesError instanceof Error
          ? rulesError.message
          : "Rules contain invalid JSON."
      );
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/campaign-games/${campaignGameId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            appearance:
              buildAppearance(appearance),
            rules: parsedRules,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Failed to save configuration."
        );
        setSaving(false);
        return;
      }

      const updatedCampaignGame =
        result.campaignGame as CampaignGame;

      setCampaignGame((current) =>
        current
          ? {
              ...current,
              appearance:
                updatedCampaignGame.appearance,
              rules: updatedCampaignGame.rules,
              updated_at:
                updatedCampaignGame.updated_at,
            }
          : updatedCampaignGame
      );

      setAppearance(
        getAppearanceSettings(
          updatedCampaignGame.appearance
        )
      );

      setRules(
        formatRules(updatedCampaignGame.rules)
      );

      setSuccess(
        "Game configuration saved successfully."
      );
    } catch {
      setError(
        "Unable to save game configuration."
      );
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="empty">
          Loading game configuration...
        </div>
      </div>
    );
  }

  if (!campaignGame) {
    return (
      <>
        <div className="admin-header">
          <div>
            <div className="eyebrow">
              GAME CONFIGURATION
            </div>

            <h1>Game Configuration</h1>
          </div>
        </div>

        <div className="error-box">
          {error || "Campaign game not found."}
        </div>
      </>
    );
  }

  const campaign = getSingleRecord(
    campaignGame.campaigns
  );

  const game = getSingleRecord(
    campaignGame.games
  );

  const isSpinGame = game?.type === "spin";

  return (
    <>
      <div className="admin-header">
        <div>
          <div className="eyebrow">
            GAME CONFIGURATION
          </div>

          <h1>
            {game?.name || "Game Configuration"}
          </h1>

          <p>
            Configure how this game appears and
            behaves inside this campaign.
          </p>
        </div>

        <button
          type="button"
          className="secondary-btn"
          onClick={() => router.back()}
        >
          ← Back
        </button>
      </div>

      <div className="admin-panel">
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#6b7280",
                marginBottom: "6px",
              }}
            >
              CAMPAIGN
            </div>

            <div style={{ fontWeight: 700 }}>
              {campaign?.name || "—"}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#6b7280",
                marginBottom: "6px",
              }}
            >
              GAME TYPE
            </div>

            <div style={{ fontWeight: 700 }}>
              {game?.type || "—"}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#6b7280",
                marginBottom: "6px",
              }}
            >
              STATUS
            </div>

            <span className="tag">
              {campaignGame.status}
            </span>
          </div>

          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#6b7280",
                marginBottom: "6px",
              }}
            >
              PUBLIC URL
            </div>

            <div
              style={{
                fontWeight: 600,
                wordBreak: "break-word",
              }}
            >
              /play/{campaignGame.public_slug}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div
          className="admin-panel"
          style={{ marginTop: "20px" }}
        >
          <div style={{ marginBottom: "22px" }}>
            <div className="eyebrow">
              GAME SETTINGS
            </div>

            <h2
              style={{
                margin: "4px 0 6px",
              }}
            >
              {isSpinGame
                ? "Spin & Win Settings"
                : "Game Settings"}
            </h2>

            <p
              style={{
                margin: 0,
                color: "#6b7280",
              }}
            >
              This game uses its reusable game
              definition. Campaign-specific settings
              can be configured below.
            </p>
          </div>

          <div
            style={{
              padding: "16px",
              borderRadius: "10px",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                marginBottom: "6px",
              }}
            >
              Game definition
            </div>

            <div
              style={{
                color: "#6b7280",
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            >
              {game?.description ||
                "No additional game definition settings have been configured yet."}
            </div>

            {game?.default_config &&
              Object.keys(game.default_config)
                .length > 0 && (
                <div
                  style={{
                    marginTop: "14px",
                    fontSize: "13px",
                    color: "#6b7280",
                  }}
                >
                  This game has reusable default
                  configuration available.
                </div>
              )}
          </div>
        </div>

        <div
          className="admin-panel"
          style={{ marginTop: "20px" }}
        >
          <div style={{ marginBottom: "22px" }}>
            <div className="eyebrow">
              APPEARANCE
            </div>

            <h2
              style={{
                margin: "4px 0 6px",
              }}
            >
              Customer View
            </h2>

            <p
              style={{
                margin: 0,
                color: "#6b7280",
              }}
            >
              Customize the campaign-specific text
              and colors shown to customers.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                Title
              </label>

              <input
                type="text"
                value={appearance.title}
                onChange={(event) =>
                  updateAppearance(
                    "title",
                    event.target.value
                  )
                }
                placeholder="SPIN & WIN"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "9px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                Button Text
              </label>

              <input
                type="text"
                value={appearance.button_text}
                onChange={(event) =>
                  updateAppearance(
                    "button_text",
                    event.target.value
                  )
                }
                placeholder="SPIN NOW"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "9px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div
              style={{
                gridColumn:
                  "1 / -1",
              }}
            >
              <label
                style={{
                  display: "block",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                Subtitle
              </label>

              <input
                type="text"
                value={appearance.subtitle}
                onChange={(event) =>
                  updateAppearance(
                    "subtitle",
                    event.target.value
                  )
                }
                placeholder="Spin daily and win exciting rewards!"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "9px",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: "24px",
              paddingTop: "24px",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                marginBottom: "16px",
              }}
            >
              Colors
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "20px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: 700,
                    marginBottom: "8px",
                  }}
                >
                  Page Background
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="color"
                    value={
                      appearance.page_background_color
                    }
                    onChange={(event) =>
                      updateAppearance(
                        "page_background_color",
                        event.target.value
                      )
                    }
                    style={{
                      width: "48px",
                      height: "42px",
                      padding: "2px",
                      border:
                        "1px solid #d1d5db",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  />

                  <input
                    type="text"
                    value={
                      appearance.page_background_color
                    }
                    onChange={(event) =>
                      updateAppearance(
                        "page_background_color",
                        event.target.value
                      )
                    }
                    style={{
                      flex: 1,
                      padding: "12px",
                      border:
                        "1px solid #d1d5db",
                      borderRadius: "9px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: 700,
                    marginBottom: "8px",
                  }}
                >
                  Button Color
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="color"
                    value={appearance.button_color}
                    onChange={(event) =>
                      updateAppearance(
                        "button_color",
                        event.target.value
                      )
                    }
                    style={{
                      width: "48px",
                      height: "42px",
                      padding: "2px",
                      border:
                        "1px solid #d1d5db",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  />

                  <input
                    type="text"
                    value={appearance.button_color}
                    onChange={(event) =>
                      updateAppearance(
                        "button_color",
                        event.target.value
                      )
                    }
                    style={{
                      flex: 1,
                      padding: "12px",
                      border:
                        "1px solid #d1d5db",
                      borderRadius: "9px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: 700,
                    marginBottom: "8px",
                  }}
                >
                  Button Text Color
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="color"
                    value={
                      appearance.button_text_color
                    }
                    onChange={(event) =>
                      updateAppearance(
                        "button_text_color",
                        event.target.value
                      )
                    }
                    style={{
                      width: "48px",
                      height: "42px",
                      padding: "2px",
                      border:
                        "1px solid #d1d5db",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  />

                  <input
                    type="text"
                    value={
                      appearance.button_text_color
                    }
                    onChange={(event) =>
                      updateAppearance(
                        "button_text_color",
                        event.target.value
                      )
                    }
                    style={{
                      flex: 1,
                      padding: "12px",
                      border:
                        "1px solid #d1d5db",
                      borderRadius: "9px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "28px",
              padding: "18px",
              borderRadius: "10px",
              background:
                appearance.page_background_color,
              border: "1px solid #e5e7eb",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "22px",
                fontWeight: 800,
                marginBottom: "6px",
              }}
            >
              {appearance.title ||
                "SPIN & WIN"}
            </div>

            <div
              style={{
                color: "#6b7280",
                marginBottom: "16px",
              }}
            >
              {appearance.subtitle ||
                "Spin daily and win exciting rewards!"}
            </div>

            <span
              style={{
                display: "inline-block",
                padding: "11px 20px",
                borderRadius: "9px",
                background:
                  appearance.button_color,
                color:
                  appearance.button_text_color,
                fontWeight: 700,
              }}
            >
              {appearance.button_text ||
                "SPIN NOW"}
            </span>
          </div>
        </div>

        <div
          className="admin-panel"
          style={{ marginTop: "20px" }}
        >
          <div style={{ marginBottom: "18px" }}>
            <div className="eyebrow">
              RULES
            </div>

            <h2
              style={{
                margin: "4px 0 6px",
              }}
            >
              Gameplay Rules
            </h2>

            <p
              style={{
                margin: 0,
                color: "#6b7280",
                lineHeight: 1.6,
              }}
            >
              Advanced campaign-specific rules are
              stored as JSON. We will replace this
              with dedicated rule controls once the
              game rule structure is finalized.
            </p>
          </div>

          <textarea
            value={rules}
            onChange={(event) =>
              setRules(event.target.value)
            }
            spellCheck={false}
            rows={10}
            style={{
              width: "100%",
              padding: "14px",
              border: "1px solid #d1d5db",
              borderRadius: "9px",
              boxSizing: "border-box",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: "13px",
              lineHeight: 1.6,
              resize: "vertical",
              background: "#fafafa",
            }}
          />
        </div>

        {error && (
          <div
            className="error-box"
            style={{ marginTop: "20px" }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              marginTop: "20px",
              padding: "12px 14px",
              borderRadius: "9px",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#065f46",
            }}
          >
            {success}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            marginTop: "20px",
            marginBottom: "30px",
          }}
        >
          <button
            type="button"
            className="secondary-btn"
            onClick={() => router.back()}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary-btn"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : "Save Configuration"}
          </button>
        </div>
      </form>
    </>
  );
}
