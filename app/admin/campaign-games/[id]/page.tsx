"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
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

type PrizeType = "winning_prize" | "no_prize";

type Prize = {
  id: string;
  campaign_game_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  weight: number;
  inventory: number | null;
  active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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
      typeof appearance?.button_text_color ===
      "string"
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
    button_text_color:
      settings.button_text_color,
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

function formatInventory(
  inventory: number | null
): string {
  return inventory === null
    ? "Unlimited"
    : inventory.toString();
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

  const [prizes, setPrizes] = useState<Prize[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingPrizes, setLoadingPrizes] =
    useState(false);

  const [addingPrize, setAddingPrize] =
    useState(false);

  const [editingPrize, setEditingPrize] =
    useState(false);

  const [deletingPrizeId, setDeletingPrizeId] =
    useState<string | null>(null);

  const [showAddPrize, setShowAddPrize] =
    useState(false);

  const [showEditPrize, setShowEditPrize] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [prizeError, setPrizeError] =
    useState("");

  const [prizeName, setPrizeName] = useState("");
  const [prizeDescription, setPrizeDescription] =
    useState("");
  const [prizeImageUrl, setPrizeImageUrl] =
    useState("");
  const [prizeWeight, setPrizeWeight] =
    useState("1");
  const [prizeInventory, setPrizeInventory] =
    useState("");
  const [prizeActive, setPrizeActive] =
    useState(true);
  const [prizeType, setPrizeType] =
    useState<PrizeType>("winning_prize");
  const [prizeMetadata, setPrizeMetadata] =
    useState<Record<string, unknown>>({});

  const [selectedPrizeId, setSelectedPrizeId] =
    useState("");

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

  async function loadPrizes() {
    if (!campaignGameId) {
      return;
    }

    setLoadingPrizes(true);
    setPrizeError("");

    try {
      const response = await fetch(
        `/api/admin/campaign-games/${campaignGameId}/prizes`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setPrizeError(
          result.error ||
            "Failed to load prizes."
        );
        setLoadingPrizes(false);
        return;
      }

      setPrizes(
        Array.isArray(result.prizes)
          ? (result.prizes as Prize[])
          : []
      );
    } catch {
      setPrizeError(
        "Unable to load prizes."
      );
    }

    setLoadingPrizes(false);
  }

  useEffect(() => {
    loadConfiguration();
    loadPrizes();
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

  function resetPrizeForm() {
    setPrizeName("");
    setPrizeDescription("");
    setPrizeImageUrl("");
    setPrizeWeight("1");
    setPrizeInventory("");
    setPrizeActive(true);
    setPrizeType("winning_prize");
    setPrizeMetadata({});
    setPrizeError("");
    setSelectedPrizeId("");
  }

  function openAddPrize() {
    resetPrizeForm();
    setShowAddPrize(true);
  }

  function closeAddPrize() {
    if (addingPrize) {
      return;
    }

    setShowAddPrize(false);
    resetPrizeForm();
  }

  function openEditPrize(prize: Prize) {
    setSelectedPrizeId(prize.id);
    setPrizeName(prize.name);
    setPrizeDescription(
      prize.description ?? ""
    );
    setPrizeImageUrl(
      prize.image_url ?? ""
    );
    setPrizeWeight(
      prize.weight.toString()
    );
    setPrizeInventory(
      prize.inventory === null
        ? ""
        : prize.inventory.toString()
    );
    setPrizeActive(prize.active);
    setPrizeType(
      prize.metadata?.prize_type === "no_prize"
        ? "no_prize"
        : "winning_prize"
    );
    setPrizeMetadata(prize.metadata ?? {});
    setPrizeError("");
    setShowEditPrize(true);
  }

  function closeEditPrize() {
    if (editingPrize) {
      return;
    }

    setShowEditPrize(false);
    resetPrizeForm();
  }

  function validatePrizeForm() {
    const name = prizeName.trim();

    const description =
      prizeDescription.trim();

    const imageUrl =
      prizeImageUrl.trim();

    const weight = Number(prizeWeight);

    const inventory =
      prizeType === "no_prize" ||
      prizeInventory.trim() === ""
        ? null
        : Number(prizeInventory);

    if (!name) {
      return {
        error: "Prize name is required.",
      };
    }

    if (
      !Number.isFinite(weight) ||
      weight < 0
    ) {
      return {
        error:
          "Weight must be a number greater than or equal to 0.",
      };
    }

    if (
      inventory !== null &&
      (!Number.isInteger(inventory) ||
        inventory < 0)
    ) {
      return {
        error:
          "Inventory must be a whole number greater than or equal to 0.",
      };
    }

    return {
      error: "",
      value: {
        name,
        description:
          description || null,
        image_url:
          imageUrl || null,
        weight,
        inventory,
        active: prizeActive,
        metadata: {
          ...prizeMetadata,
          prize_type: prizeType,
        },
      },
    };
  }

  async function handleAddPrize(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setAddingPrize(true);
    setPrizeError("");

    const validation =
      validatePrizeForm();

    if (validation.error) {
      setPrizeError(validation.error);
      setAddingPrize(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/campaign-games/${campaignGameId}/prizes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            validation.value
          ),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setPrizeError(
          result.error ||
            "Failed to create prize."
        );
        setAddingPrize(false);
        return;
      }

      const createdPrize =
        result.prize as Prize;

      setPrizes((current) => [
        ...current,
        createdPrize,
      ]);

      setShowAddPrize(false);
      resetPrizeForm();

      setSuccess(
        "Prize added successfully."
      );
    } catch {
      setPrizeError(
        "Unable to create prize."
      );
    }

    setAddingPrize(false);
  }

  async function handleEditPrize(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedPrizeId) {
      setPrizeError("Prize ID is missing.");
      return;
    }

    setEditingPrize(true);
    setPrizeError("");

    const validation =
      validatePrizeForm();

    if (validation.error) {
      setPrizeError(validation.error);
      setEditingPrize(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/campaign-games/${campaignGameId}/prizes`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prize_id: selectedPrizeId,
            ...validation.value,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setPrizeError(
          result.error ||
            "Failed to update prize."
        );
        setEditingPrize(false);
        return;
      }

      const updatedPrize =
        result.prize as Prize;

      setPrizes((current) =>
        current.map((prize) =>
          prize.id === updatedPrize.id
            ? updatedPrize
            : prize
        )
      );

      setShowEditPrize(false);
      resetPrizeForm();

      setSuccess(
        "Prize updated successfully."
      );
    } catch {
      setPrizeError(
        "Unable to update prize."
      );
    }

    setEditingPrize(false);
  }

  async function handleDeletePrize(
    prize: Prize
  ) {
    const confirmed = window.confirm(
      `Delete "${prize.name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingPrizeId(prize.id);
    setPrizeError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/campaign-games/${campaignGameId}/prizes`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prize_id: prize.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setPrizeError(
          result.error ||
            "Failed to delete prize."
        );
        setDeletingPrizeId(null);
        return;
      }

      setPrizes((current) =>
        current.filter(
          (item) => item.id !== prize.id
        )
      );

      setSuccess(
        "Prize deleted successfully."
      );
    } catch {
      setPrizeError(
        "Unable to delete prize."
      );
    }

    setDeletingPrizeId(null);
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
              rules:
                updatedCampaignGame.rules,
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
        formatRules(
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
          {error ||
            "Campaign game not found."}
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

  const isSpinGame =
    game?.type === "spin";

  return (
    <>
      <div className="admin-header">
        <div>
          <div className="eyebrow">
            GAME CONFIGURATION
          </div>

          <h1>
            {game?.name ||
              "Game Configuration"}
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
              /play/
              {campaignGame.public_slug}
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
              definition. Campaign-specific
              settings can be configured below.
            </p>
          </div>

          <div
            style={{
              padding: "16px",
              borderRadius: "10px",
              background: "#f9fafb",
              border:
                "1px solid #e5e7eb",
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
              Object.keys(
                game.default_config
              ).length > 0 && (
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
              Customize the campaign-specific
              text and colors shown to customers.
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
                  border:
                    "1px solid #d1d5db",
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
                  border:
                    "1px solid #d1d5db",
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
                  border:
                    "1px solid #d1d5db",
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
                Page Background
              </label>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
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
                    width: "52px",
                    height: "44px",
                    padding: "2px",
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
                }}
              >
                <input
                  type="color"
                  value={
                    appearance.button_color
                  }
                  onChange={(event) =>
                    updateAppearance(
                      "button_color",
                      event.target.value
                    )
                  }
                  style={{
                    width: "52px",
                    height: "44px",
                    padding: "2px",
                  }}
                />

                <input
                  type="text"
                  value={
                    appearance.button_color
                  }
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
                    width: "52px",
                    height: "44px",
                    padding: "2px",
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
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "24px",
              padding: "28px",
              borderRadius: "12px",
              background:
                appearance.page_background_color,
              border:
                "1px solid #e5e7eb",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "28px",
                fontWeight: 800,
                marginBottom: "8px",
              }}
            >
              {appearance.title ||
                "SPIN & WIN"}
            </div>

            <div
              style={{
                color: "#6b7280",
                marginBottom: "20px",
              }}
            >
              {appearance.subtitle ||
                "Spin daily and win exciting rewards!"}
            </div>

            <button
              type="button"
              style={{
                border: "none",
                borderRadius: "999px",
                padding: "12px 24px",
                background:
                  appearance.button_color,
                color:
                  appearance.button_text_color,
                fontWeight: 800,
                cursor: "default",
              }}
            >
              {appearance.button_text ||
                "SPIN NOW"}
            </button>
          </div>
        </div>

        <div
          className="admin-panel"
          style={{ marginTop: "20px" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "22px",
            }}
          >
            <div>
              <div className="eyebrow">
                PRIZES
              </div>

              <h2
                style={{
                  margin: "4px 0 6px",
                }}
              >
                Prize Management
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#6b7280",
                  lineHeight: 1.6,
                }}
              >
                Add, edit, activate, deactivate,
                or delete the rewards customers
                can win in this campaign game.
              </p>
            </div>

            <button
              type="button"
              className="primary-btn"
              onClick={openAddPrize}
            >
              + Add Prize
            </button>
          </div>

          {prizeError && (
            <div
              className="error-box"
              style={{
                marginBottom: "16px",
              }}
            >
              {prizeError}
            </div>
          )}

          {loadingPrizes ? (
            <div className="empty">
              Loading prizes...
            </div>
          ) : prizes.length === 0 ? (
            <div
              style={{
                padding: "28px",
                textAlign: "center",
                border:
                  "1px dashed #d1d5db",
                borderRadius: "10px",
                color: "#6b7280",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                No prizes added yet
              </div>

              <div
                style={{
                  fontSize: "14px",
                }}
              >
                Add the first prize for this game.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              {prizes.map((prize) => (
                <div
                  key={prize.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(0, 1fr) auto auto",
                    gap: "16px",
                    alignItems: "center",
                    padding: "16px",
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: "10px",
                    background: "#ffffff",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap",
                        marginBottom: "6px",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: "16px",
                        }}
                      >
                        {prize.name}
                      </div>

                      <span className="tag">
                        {prize.active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>

                    {prize.description && (
                      <div
                        style={{
                          color: "#6b7280",
                          fontSize: "14px",
                          marginBottom: "10px",
                        }}
                      >
                        {prize.description}
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        gap: "18px",
                        flexWrap: "wrap",
                        color: "#6b7280",
                        fontSize: "13px",
                      }}
                    >
                      <span>
                        <strong>
                          Weight:
                        </strong>{" "}
                        {prize.weight}
                      </span>

                      <span>
                        <strong>
                          Inventory:
                        </strong>{" "}
                        {formatInventory(
                          prize.inventory
                        )}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "10px",
                      border:
                        "1px solid #e5e7eb",
                      background: "#f9fafb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "center",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {prize.image_url ? (
                      <img
                        src={prize.image_url}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#9ca3af",
                          textAlign: "center",
                        }}
                      >
                        No image
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() =>
                        openEditPrize(prize)
                      }
                      disabled={
                        deletingPrizeId ===
                        prize.id
                      }
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() =>
                        handleDeletePrize(prize)
                      }
                      disabled={
                        deletingPrizeId ===
                        prize.id
                      }
                      style={{
                        color: "#b91c1c",
                        borderColor: "#fecaca",
                      }}
                    >
                      {deletingPrizeId ===
                      prize.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              Advanced campaign-specific rules
              are stored as JSON. We will replace
              this with dedicated rule controls once
              the game rule structure is finalized.
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
              border:
                "1px solid #d1d5db",
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
              border:
                "1px solid #a7f3d0",
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

      {showAddPrize && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(17, 24, 39, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "620px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: "14px",
              boxShadow:
                "0 20px 50px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                padding: "22px 24px",
                borderBottom:
                  "1px solid #e5e7eb",
              }}
            >
              <div className="eyebrow">
                ADD PRIZE
              </div>

              <h2
                style={{
                  margin: "4px 0 6px",
                }}
              >
                Add New Prize
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#6b7280",
                  lineHeight: 1.5,
                }}
              >
                Create a reward that can be won
                by customers in this game.
              </p>
            </div>

            <form
              onSubmit={handleAddPrize}
            >
              <div
                style={{
                  padding: "24px",
                  display: "grid",
                  gap: "18px",
                }}
              >
                {prizeError && (
                  <div className="error-box">
                    {prizeError}
                  </div>
                )}

                <PrizeFormFields
                  prizeName={prizeName}
                  setPrizeName={setPrizeName}
                  prizeDescription={
                    prizeDescription
                  }
                  setPrizeDescription={
                    setPrizeDescription
                  }
                  prizeImageUrl={
                    prizeImageUrl
                  }
                  setPrizeImageUrl={
                    setPrizeImageUrl
                  }
                  prizeWeight={
                    prizeWeight
                  }
                  setPrizeWeight={
                    setPrizeWeight
                  }
                  prizeInventory={
                    prizeInventory
                  }
                  setPrizeInventory={
                    setPrizeInventory
                  }
                  prizeActive={
                    prizeActive
                  }
                  setPrizeActive={
                    setPrizeActive
                  }
                  prizeType={prizeType}
                  setPrizeType={setPrizeType}
                />
              </div>

              <div
                style={{
                  padding: "18px 24px",
                  borderTop:
                    "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent:
                    "flex-end",
                  gap: "12px",
                }}
              >
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={
                    closeAddPrize
                  }
                  disabled={addingPrize}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={addingPrize}
                >
                  {addingPrize
                    ? "Adding..."
                    : "Add Prize"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditPrize && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(17, 24, 39, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "620px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: "14px",
              boxShadow:
                "0 20px 50px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                padding: "22px 24px",
                borderBottom:
                  "1px solid #e5e7eb",
              }}
            >
              <div className="eyebrow">
                EDIT PRIZE
              </div>

              <h2
                style={{
                  margin: "4px 0 6px",
                }}
              >
                Edit Prize
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#6b7280",
                  lineHeight: 1.5,
                }}
              >
                Update the reward details for
                this campaign game.
              </p>
            </div>

            <form
              onSubmit={handleEditPrize}
            >
              <div
                style={{
                  padding: "24px",
                  display: "grid",
                  gap: "18px",
                }}
              >
                {prizeError && (
                  <div className="error-box">
                    {prizeError}
                  </div>
                )}

                <PrizeFormFields
                  prizeName={prizeName}
                  setPrizeName={setPrizeName}
                  prizeDescription={
                    prizeDescription
                  }
                  setPrizeDescription={
                    setPrizeDescription
                  }
                  prizeImageUrl={
                    prizeImageUrl
                  }
                  setPrizeImageUrl={
                    setPrizeImageUrl
                  }
                  prizeWeight={
                    prizeWeight
                  }
                  setPrizeWeight={
                    setPrizeWeight
                  }
                  prizeInventory={
                    prizeInventory
                  }
                  setPrizeInventory={
                    setPrizeInventory
                  }
                  prizeActive={
                    prizeActive
                  }
                  setPrizeActive={
                    setPrizeActive
                  }
                  prizeType={prizeType}
                  setPrizeType={setPrizeType}
                />
              </div>

              <div
                style={{
                  padding: "18px 24px",
                  borderTop:
                    "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent:
                    "flex-end",
                  gap: "12px",
                }}
              >
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={
                    closeEditPrize
                  }
                  disabled={editingPrize}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={editingPrize}
                >
                  {editingPrize
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

type PrizeFormFieldsProps = {
  prizeName: string;
  setPrizeName: (value: string) => void;
  prizeDescription: string;
  setPrizeDescription: (
    value: string
  ) => void;
  prizeImageUrl: string;
  setPrizeImageUrl: (
    value: string
  ) => void;
  prizeWeight: string;
  setPrizeWeight: (value: string) => void;
  prizeInventory: string;
  setPrizeInventory: (
    value: string
  ) => void;
  prizeActive: boolean;
  setPrizeActive: (
    value: boolean
  ) => void;
  prizeType: PrizeType;
  setPrizeType: (value: PrizeType) => void;
};

function PrizeFormFields({
  prizeName,
  setPrizeName,
  prizeDescription,
  setPrizeDescription,
  prizeImageUrl,
  setPrizeImageUrl,
  prizeWeight,
  setPrizeWeight,
  prizeInventory,
  setPrizeInventory,
  prizeActive,
  setPrizeActive,
  prizeType,
  setPrizeType,
}: PrizeFormFieldsProps) {
  return (
    <>
      <div>
        <label
          style={{
            display: "block",
            fontWeight: 700,
            marginBottom: "8px",
          }}
        >
          Prize Type *
        </label>

        <select
          value={prizeType}
          onChange={(event) => {
            const nextType = event.target.value as PrizeType;
            setPrizeType(nextType);
            if (nextType === "no_prize") {
              setPrizeInventory("");
            }
          }}
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid #d1d5db",
            borderRadius: "9px",
            boxSizing: "border-box",
            background: "#ffffff",
          }}
        >
          <option value="winning_prize">Winning Prize</option>
          <option value="no_prize">No Prize / Try Again</option>
        </select>

        <div style={{ marginTop: "6px", fontSize: "12px", color: "#6b7280" }}>
          {prizeType === "no_prize"
            ? "No coupon or inventory will be used for this result."
            : "Winning prizes can generate a coupon and use inventory."}
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
          Prize Name *
        </label>

        <input
          type="text"
          value={prizeName}
          onChange={(event) =>
            setPrizeName(
              event.target.value
            )
          }
          placeholder="Example: Rs. 1,000 Voucher"
          autoFocus
          style={{
            width: "100%",
            padding: "12px",
            border:
              "1px solid #d1d5db",
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
          Description
        </label>

        <textarea
          value={prizeDescription}
          onChange={(event) =>
            setPrizeDescription(
              event.target.value
            )
          }
          placeholder="Optional prize description"
          rows={3}
          style={{
            width: "100%",
            padding: "12px",
            border:
              "1px solid #d1d5db",
            borderRadius: "9px",
            boxSizing: "border-box",
            resize: "vertical",
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
          Image URL
        </label>

        <input
          type="url"
          value={prizeImageUrl}
          onChange={(event) =>
            setPrizeImageUrl(
              event.target.value
            )
          }
          placeholder="https://..."
          style={{
            width: "100%",
            padding: "12px",
            border:
              "1px solid #d1d5db",
            borderRadius: "9px",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: "16px",
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
            Weight *
          </label>

          <input
            type="number"
            min="0"
            step="any"
            value={prizeWeight}
            onChange={(event) =>
              setPrizeWeight(
                event.target.value
              )
            }
            placeholder="1"
            style={{
              width: "100%",
              padding: "12px",
              border:
                "1px solid #d1d5db",
              borderRadius: "9px",
              boxSizing: "border-box",
            }}
          />

          <div
            style={{
              marginTop: "6px",
              fontSize: "12px",
              color: "#6b7280",
            }}
          >
            Higher weight means a higher
            relative chance.
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
            Inventory
          </label>

          <input
            type="number"
            min="0"
            step="1"
            value={prizeInventory}
            onChange={(event) =>
              setPrizeInventory(
                event.target.value
              )
            }
            disabled={prizeType === "no_prize"}
            placeholder={
              prizeType === "no_prize"
                ? "Not applicable"
                : "Unlimited"
            }
            style={{
              width: "100%",
              padding: "12px",
              border:
                "1px solid #d1d5db",
              borderRadius: "9px",
              boxSizing: "border-box",
            }}
          />

          <div
            style={{
              marginTop: "6px",
              fontSize: "12px",
              color: "#6b7280",
            }}
          >
            {prizeType === "no_prize"
              ? "Inventory is not used for no-prize results."
              : "Leave empty for unlimited."}
          </div>
        </div>
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={prizeActive}
          onChange={(event) =>
            setPrizeActive(
              event.target.checked
            )
          }
          style={{
            width: "18px",
            height: "18px",
          }}
        />

        <span
          style={{
            fontWeight: 700,
          }}
        >
          Prize is active
        </span>
      </label>
    </>
  );
}
