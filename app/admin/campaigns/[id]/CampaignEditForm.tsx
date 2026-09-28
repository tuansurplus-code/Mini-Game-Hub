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

export default function CampaignEditForm({ campaign }: Props) {
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Campaign name is required.");
      return;
    }

    if (startsAt && endsAt) {
      const start = new Date(`${startsAt}:00+05:30`);
      const end = new Date(`${endsAt}:00+05:30`);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
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
      const response = await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          starts_at: colomboDateTimeToUtc(startsAt || null),
          ends_at: colomboDateTimeToUtc(endsAt || null),
          status,
          scheduling_mode: schedulingMode,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to update campaign.");
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

  const automaticMode = schedulingMode === "automatic";

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="error-box" style={{ marginBottom: "16px" }}>
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
              event.target.value as "manual" | "automatic"
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
          Automatic mode controls the campaign status using the start and end
          dates.
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
            onChange={(event) => setStatus(event.target.value)}
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
            Status is managed automatically from the campaign schedule.
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
          onChange={(event) => setStartsAt(event.target.value)}
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
          onChange={(event) => setEndsAt(event.target.value)}
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
  );
}
