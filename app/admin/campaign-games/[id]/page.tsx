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

function getSingleRecord<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function formatJson(
  value: Record<string, unknown> | null
) {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseJson(
  value: string,
  fieldName: string
): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error(
        `${fieldName} must be a JSON object.`
      );
    }

    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(
      `${fieldName} contains invalid JSON.`
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

  const [appearance, setAppearance] = useState("{}");
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
        formatJson(
          loadedCampaignGame.appearance
        )
      );

      setRules(
        formatJson(
          loadedCampaignGame.rules
        )
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

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    let parsedAppearance: Record<
      string,
      unknown
    >;

    let parsedRules: Record<
      string,
      unknown
    >;

    try {
      parsedAppearance = parseJson(
        appearance,
        "Appearance"
      );

      parsedRules = parseJson(
        rules,
        "Rules"
      );
    } catch (jsonError) {
      setError(
        jsonError instanceof Error
          ? jsonError.message
          : "Invalid JSON."
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
            appearance: parsedAppearance,
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
        formatJson(
          updatedCampaignGame.appearance
        )
      );

      setRules(
        formatJson(
          updatedCampaignGame.rules
        )
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
            Configure how this game behaves inside
            this campaign.
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
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#6b7280",
                marginBottom: "5px",
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
                marginBottom: "5px",
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
                marginBottom: "5px",
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
                marginBottom: "5px",
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
          <div style={{ marginBottom: "18px" }}>
            <h2
              style={{
                margin: 0,
                marginBottom: "6px",
              }}
            >
              Appearance
            </h2>

            <p
              style={{
                margin: 0,
                color: "#6b7280",
              }}
            >
              Campaign-specific visual settings for
              this game.
            </p>
          </div>

          <textarea
            value={appearance}
            onChange={(event) =>
              setAppearance(event.target.value)
            }
            spellCheck={false}
            rows={14}
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

        <div
          className="admin-panel"
          style={{ marginTop: "20px" }}
        >
          <div style={{ marginBottom: "18px" }}>
            <h2
              style={{
                margin: 0,
                marginBottom: "6px",
              }}
            >
              Rules
            </h2>

            <p
              style={{
                margin: 0,
                color: "#6b7280",
              }}
            >
              Campaign-specific rules and gameplay
              settings.
            </p>
          </div>

          <textarea
            value={rules}
            onChange={(event) =>
              setRules(event.target.value)
            }
            spellCheck={false}
            rows={14}
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
            marginTop: "20px",
            marginBottom: "30px",
          }}
        >
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
