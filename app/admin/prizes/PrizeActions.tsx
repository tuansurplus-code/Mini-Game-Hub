"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Prize = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  weight: number;
  inventory: number | null;
  active: boolean;
};

export default function PrizeActions({
  prize,
}: {
  prize: Prize;
}) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState(prize.name);
  const [description, setDescription] = useState(
    prize.description ?? ""
  );
  const [imageUrl, setImageUrl] = useState(
    prize.image_url ?? ""
  );
  const [weight, setWeight] = useState(String(prize.weight));
  const [inventory, setInventory] = useState(
    prize.inventory === null
      ? ""
      : String(prize.inventory)
  );
  const [active, setActive] = useState(prize.active);

  function openEdit() {
    setName(prize.name);
    setDescription(prize.description ?? "");
    setImageUrl(prize.image_url ?? "");
    setWeight(String(prize.weight));
    setInventory(
      prize.inventory === null
        ? ""
        : String(prize.inventory)
    );
    setActive(prize.active);
    setError("");
    setEditing(true);
  }

  async function savePrize() {
    setError("");

    if (!name.trim()) {
      setError("Prize name is required.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/prizes", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: prize.id,
          name,
          description,
          image_url: imageUrl,
          weight,
          inventory,
          active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to update prize."
        );
      }

      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update prize."
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive() {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/prizes", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: prize.id,
          name: prize.name,
          description: prize.description ?? "",
          image_url: prize.image_url ?? "",
          weight: prize.weight,
          inventory:
            prize.inventory === null
              ? ""
              : prize.inventory,
          active: !prize.active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to update prize status."
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update prize status."
      );
    } finally {
      setLoading(false);
    }
  }

  async function deletePrize() {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${prize.name}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/prizes", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: prize.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to delete prize."
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete prize."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={openEdit}
          disabled={loading}
          style={{
            border: "1px solid #d1d5db",
            background: "#fff",
            borderRadius: "8px",
            padding: "7px 12px",
            cursor: "pointer",
          }}
        >
          Edit
        </button>

        <button
          type="button"
          onClick={toggleActive}
          disabled={loading}
          style={{
            border: "1px solid #d1d5db",
            background: "#fff",
            borderRadius: "8px",
            padding: "7px 12px",
            cursor: "pointer",
          }}
        >
          {prize.active ? "Deactivate" : "Activate"}
        </button>

        <button
          type="button"
          onClick={deletePrize}
          disabled={loading}
          style={{
            border: "1px solid #fecaca",
            background: "#fff",
            color: "#dc2626",
            borderRadius: "8px",
            padding: "7px 12px",
            cursor: "pointer",
          }}
        >
          Delete
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: "8px",
            color: "#dc2626",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      {editing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
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
              maxWidth: "560px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "14px",
              padding: "24px",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "22px",
                }}
              >
                Edit Prize
              </h2>

              <button
                type="button"
                onClick={() => setEditing(false)}
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

            {error && (
              <div className="error-box">
                {error}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gap: "14px",
              }}
            >
              <label>
                <div style={{ marginBottom: "6px" }}>
                  Prize Name
                </div>

                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  style={inputStyle}
                />
              </label>

              <label>
                <div style={{ marginBottom: "6px" }}>
                  Description
                </div>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  rows={3}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                  }}
                />
              </label>

              <label>
                <div style={{ marginBottom: "6px" }}>
                  Image URL
                </div>

                <input
                  value={imageUrl}
                  onChange={(e) =>
                    setImageUrl(e.target.value)
                  }
                  style={inputStyle}
                />
              </label>

              <label>
                <div style={{ marginBottom: "6px" }}>
                  Weight
                </div>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={weight}
                  onChange={(e) =>
                    setWeight(e.target.value)
                  }
                  style={inputStyle}
                />
              </label>

              <label>
                <div style={{ marginBottom: "6px" }}>
                  Inventory
                </div>

                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Leave empty for unlimited"
                  value={inventory}
                  onChange={(e) =>
                    setInventory(e.target.value)
                  }
                  style={inputStyle}
                />
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) =>
                    setActive(e.target.checked)
                  }
                />

                Active
              </label>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "24px",
              }}
            >
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={loading}
                style={secondaryButtonStyle}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={savePrize}
                disabled={loading}
                className="primary-btn"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
  boxSizing: "border-box",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  background: "#fff",
  borderRadius: "8px",
  padding: "10px 16px",
  cursor: "pointer",
};
