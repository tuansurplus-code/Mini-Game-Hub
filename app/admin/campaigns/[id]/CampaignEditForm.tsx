"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Campaign = {
  id: string;
  name: string;
  slug: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

type Props = {
  campaign: Campaign;
};

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(
    date.getTime() - offset * 60 * 1000
  );

  return localDate.toISOString().slice(0, 16);
}

export default function CampaignEditForm({
  campaign,
}: Props) {
  const router = useRouter();

  const [name, setName] = useState(campaign.name);
  const [startsAt, setStartsAt] = useState(
    toDateTimeLocal(campaign.starts_at)
  );
  const [endsAt, setEndsAt] = useState(
    toDateTimeLocal(campaign.ends_at)
  );
  const [status, setStatus] = useState(campaign.status);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!name.trim()) {
      setError("Please enter a campaign name.");
      return;
    }

    if (startsAt && endsAt) {
      const start = new Date(startsAt);
      const end = new Date(endsAt);

      if (end <= start) {
        setError(
          "End date must be after the start date."
        );
        return;
      }
    }

    setSaving(true);

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
            starts_at: startsAt || null,
            ends_at: endsAt || null,
            status,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Failed to update campaign."
        );
        setSaving(false);
        return;
      }

      setMessage(
        "Campaign updated successfully."
      );

      setSaving(false);

      router.refresh();
    } catch {
      setError(
        "Unable to update campaign."
      );
      setSaving(false);
    }
  }

  return (
    <div
      className="admin-panel"
      style={{
        maxWidth: "720px",
      }}
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div
            className="error-box"
            style={{
              marginBottom: "18px",
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            className="success-box"
            style={{
              marginBottom: "18px",
            }}
          >
            {message}
          </div>
        )}

        <div style={{ marginBottom: "18px" }}>
          <label
            htmlFor="campaign-name"
            style={{
              display: "block",
              marginBottom: "7px",
              fontWeight: 600,
            }}
          >
            Campaign Name
          </label>

          <input
            id="campaign-name"
            type="text"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            disabled={saving}
            style={{
              width: "100%",
              padding: "11px 13px",
              border: "1px solid #d8dde5",
              borderRadius: "9px",
              fontSize: "14px",
            }}
          />
        </div>

        <div
          style={{
            marginBottom: "18px",
          }}
        >
          <label
            htmlFor="campaign-status"
            style={{
              display: "block",
              marginBottom: "7px",
              fontWeight: 600,
            }}
          >
            Campaign Status
          </label>

          <select
            id="campaign-status"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
            }
            disabled={saving}
            style={{
              width: "100%",
              padding: "11px 13px",
              border: "1px solid #d8dde5",
              borderRadius: "9px",
              background: "#ffffff",
              fontSize: "14px",
            }}
          >
            <option value="draft">
              Draft
            </option>

            <option value="scheduled">
              Scheduled
            </option>

            <option value="active">
              Active
            </option>

            <option value="ended">
              Ended
            </option>

            <option value="archived">
              Archived
            </option>
          </select>
        </div>

        <div
          style={{
            marginBottom: "18px",
          }}
        >
          <label
            htmlFor="campaign-start"
            style={{
              display: "block",
              marginBottom: "7px",
              fontWeight: 600,
            }}
          >
            Start Date &amp; Time
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
              padding: "11px 13px",
              border: "1px solid #d8dde5",
              borderRadius: "9px",
              fontSize: "14px",
            }}
          />
        </div>

        <div
          style={{
            marginBottom: "24px",
          }}
        >
          <label
            htmlFor="campaign-end"
            style={{
              display: "block",
              marginBottom: "7px",
              fontWeight: 600,
            }}
          >
            End Date &amp; Time
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
              padding: "11px 13px",
              border: "1px solid #d8dde5",
              borderRadius: "9px",
              fontSize: "14px",
            }}
          />
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
            onClick={() =>
              router.push("/admin/campaigns")
            }
            disabled={saving}
            style={{
              padding: "10px 16px",
              border: "1px solid #d8dde5",
              borderRadius: "9px",
              background: "#ffffff",
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
              ? "Saving..."
              : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
