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

function formatStatus(status: string) {
  if (!status) {
    return "—";
  }

  return (
    status.charAt(0).toUpperCase() +
    status.slice(1)
  );
}

export default function CampaignEditForm({
  campaign,
}: Props) {
  const router = useRouter();

  const [name, setName] = useState(campaign.name);

  const [schedulingMode, setSchedulingMode] = useState(
    campaign.scheduling_mode || "manual"
  );

  const [startsAt, setStartsAt] = useState(
    toDateTimeLocal(campaign.starts_at)
  );

  const [endsAt, setEndsAt] = useState(
    toDateTimeLocal(campaign.ends_at)
  );

  const [status, setStatus] = useState(
    campaign.status
  );

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

    if (
      !["manual", "automatic"].includes(
        schedulingMode
      )
    ) {
      setError("Invalid scheduling mode.");
      return;
    }

    if (startsAt && endsAt) {
      const start = new Date(startsAt);
      const end = new Date(endsAt);

      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
      ) {
        setError("Invalid campaign date or time.");
        return;
      }

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
            scheduling_mode: schedulingMode,
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

  const automaticMode =
    schedulingMode === "automatic";

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

        <div
          style={{
            marginBottom: "18px",
          }}
        >
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
            htmlFor="campaign-scheduling-mode"
            style={{
              display: "block",
              marginBottom: "7px",
              fontWeight: 600,
            }}
          >
            Scheduling Mode
          </label>

          <select
            id="campaign-scheduling-mode"
            value={schedulingMode}
            onChange={(event) =>
              setSchedulingMode(event.target.value)
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
            <option value="automatic">
              Automatic
            </option>

            <option value="manual">
              Manual
            </option>
          </select>

          <p
            style={{
              marginTop: "7px",
              marginBottom: 0,
              color: "#697386",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            {automaticMode
              ? "The campaign status will be automatically controlled using the start and end dates."
              : "You control the campaign status manually."}
          </p>
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

          {automaticMode ? (
            <>
              <div
                id="campaign-status"
                style={{
                  width: "100%",
                  padding: "11px 13px",
                  border: "1px solid #d8dde5",
                  borderRadius: "9px",
                  background: "#f3f4f6",
                  fontSize: "14px",
                  fontWeight: 600,
                  boxSizing: "border-box",
                }}
              >
                {formatStatus(status)}
              </div>

              <p
                style={{
                  marginTop: "7px",
                  marginBottom: 0,
                  color: "#697386",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                Automatic mode controls this status
                from the campaign start and end
                dates.
              </p>
            </>
          ) : (
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
          )}
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
