"use client";

import { useState } from "react";

type Props = {
  publicSlug: string | null;
};

export default function CampaignPublicActions({ publicSlug }: Props) {
  const [copied, setCopied] = useState(false);

  if (!publicSlug) {
    return <span style={{ color: "#888", fontSize: "13px" }}>No public link</span>;
  }

  const path = `/campaign/${publicSlug}`;

  function openPreview() {
    window.open(path, "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    const url = `${window.location.origin}${path}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this customer link:", url);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: "6px", width: "100px" }}>
      <button
        type="button"
        onClick={openPreview}
        className="secondary-btn"
        style={{ whiteSpace: "nowrap", cursor: "pointer", width: "100%" }}
      >
        Preview
      </button>
      <button
        type="button"
        onClick={copyLink}
        className="secondary-btn"
        style={{ whiteSpace: "nowrap", cursor: "pointer", width: "100%" }}
      >
        {copied ? "Copied!" : "Copy Link"}
      </button>
    </div>
  );
}
