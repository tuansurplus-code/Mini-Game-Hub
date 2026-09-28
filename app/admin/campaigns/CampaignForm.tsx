"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function CampaignForm() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [schedulingMode, setSchedulingMode] = useState<
    "manual" | "automatic"
  >("automatic");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Please enter a campaign name.");
      return;
    }

    if (startsAt && endsAt) {
      const start = new Date(`${startsAt}:00+05:30`);
      const end = new Date(`${endsAt}:00+05:30`);

      if (end <= start) {
        setError("End date must be after the start date.");
        return;
      }
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          starts_at: colomboDateTimeToUtc(startsAt || null),
          ends_at: colomboDateTimeToUtc(endsAt || null),
          scheduling_mode: schedulingMode,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to create campaign.");
        setSaving(false);
        return;
      }

      setName("");
      setStartsAt("");
      setEndsAt("");
      setSchedulingMode("automatic");
      setOpen(false);
      setSaving(false);

      router.refresh();
    } catch {
      setError("Unable to create campaign.");
      setSaving(false);
    }
  }

  return (
    <>
      <button
        className="primary-btn"
        onClick={() => {
          setOpen(true);
          setError("");
          setSchedulingMode("automatic");
        }}
      >
        + New Campaign
      </button>

      {open && (
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
            className="admin-panel"
            style={{
              width: "100%",
              maxWidth: "520px",
            }}
          >
            <h2>Create New Campaign</h2>

            <p style={{ marginBottom: "20px" }}>
              Create a campaign first. Games and prizes can be assigned later.
            </p>

            {error && (
              <div className="error-box" style={{ marginBottom: "16px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
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
                  placeholder="Example: Mobile Mania September 2026"
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
                  Automatic mode changes the campaign status based on the
                  start and end dates.
                </small>
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
                  Time is entered in Sri Lanka time.
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
                  Time is entered in Sri Lanka time.
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
                  onClick={() => {
                    setOpen(false);
                    setError("");
                  }}
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
                  {saving ? "Creating..." : "Create Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
