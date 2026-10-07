"use client";

import { useState } from "react";

type Props = {
  publicSlug: string;
  published: boolean;
};

export default function PublicGameAccess({ publicSlug, published }: Props) {
  const [copied, setCopied] = useState(false);
  const path = `/play/${publicSlug}`;

  function getUrl() {
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function openCustomerView() {
    window.open(getUrl(), "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
      <button
        type="button"
        onClick={copyUrl}
        disabled={!published}
        title={published ? "Copy the public game URL" : "Publish the game first"}
        style={{
          padding: "8px 11px",
          border: "1px solid #ddd",
          borderRadius: 8,
          background: published ? "#fff" : "#f3f3f3",
          color: published ? "#222" : "#888",
          cursor: published ? "pointer" : "default",
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {copied ? "✓ Copied" : "Copy URL"}
      </button>

      <button
        type="button"
        onClick={openCustomerView}
        disabled={!published}
        title={published ? "Open the customer game in a new tab" : "Publish the game first"}
        style={{
          padding: "8px 11px",
          border: "1px solid #111827",
          borderRadius: 8,
          background: published ? "#111827" : "#f3f3f3",
          color: published ? "#fff" : "#888",
          cursor: published ? "pointer" : "default",
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        Open Customer View ↗
      </button>
    </div>
  );
}
