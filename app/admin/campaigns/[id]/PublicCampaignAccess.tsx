"use client";

import { useState } from "react";

type Props = {
  campaignSlug: string;
  available: boolean;
};

export default function PublicCampaignAccess({
  campaignSlug,
  available,
}: Props) {
  const [copied, setCopied] = useState(false);
  const path = `/campaign/${campaignSlug}`;

  function getUrl() {
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
  }

  async function copyUrl() {
    if (!available) return;

    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function openCustomerView() {
    if (!available) return;
    window.open(getUrl(), "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          fontSize: 13,
          color: "#666",
          wordBreak: "break-word",
          marginBottom: 10,
        }}
      >
        {path}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={copyUrl}
          disabled={!available}
          title={available ? "Copy the public campaign URL" : "Campaign must be active and within its schedule"}
          style={{
            padding: "8px 11px",
            border: "1px solid #ddd",
            borderRadius: 8,
            background: available ? "#fff" : "#f3f3f3",
            color: available ? "#222" : "#888",
            cursor: available ? "pointer" : "default",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {copied ? "✓ Copied" : "Copy Campaign URL"}
        </button>

        <button
          type="button"
          onClick={openCustomerView}
          disabled={!available}
          title={available ? "Open the public campaign page in a new tab" : "Campaign must be active and within its schedule"}
          style={{
            padding: "8px 11px",
            border: "1px solid #111827",
            borderRadius: 8,
            background: available ? "#111827" : "#f3f3f3",
            color: available ? "#fff" : "#888",
            cursor: available ? "pointer" : "default",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Open Campaign View ↗
        </button>
      </div>

      {!available && (
        <div style={{ marginTop: 8, color: "#777", fontSize: 12 }}>
          Public campaign access is available only while the campaign is active and within its schedule.
        </div>
      )}
    </div>
  );
}
