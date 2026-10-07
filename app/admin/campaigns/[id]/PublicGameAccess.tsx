"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  publicSlug: string;
  published: boolean;
};

export default function PublicGameAccess({ publicSlug, published }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [error, setError] = useState("");
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

  async function unpublishGame() {
    if (!published || unpublishing) return;

    const confirmed = window.confirm(
      "Unpublish this game?\n\nCustomers will no longer be able to access this game until you publish it again. Existing prizes, winners, coupons, settings and reports will not be deleted."
    );

    if (!confirmed) return;

    setUnpublishing(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/campaign-games/${encodeURIComponent(publicSlug)}/unpublish`,
        { method: "POST" }
      );
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to unpublish game.");
        setUnpublishing(false);
        return;
      }

      setUnpublishing(false);
      router.refresh();
    } catch {
      setError("Unable to unpublish game.");
      setUnpublishing(false);
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={copyUrl}
          disabled={!published || unpublishing}
          title={published ? "Copy the public game URL" : "Publish the game first"}
          style={{
            padding: "8px 11px",
            border: "1px solid #ddd",
            borderRadius: 8,
            background: published ? "#fff" : "#f3f3f3",
            color: published ? "#222" : "#888",
            cursor: published && !unpublishing ? "pointer" : "default",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {copied ? "✓ Copied" : "Copy URL"}
        </button>

        <button
          type="button"
          onClick={openCustomerView}
          disabled={!published || unpublishing}
          title={published ? "Open the customer game in a new tab" : "Publish the game first"}
          style={{
            padding: "8px 11px",
            border: "1px solid #111827",
            borderRadius: 8,
            background: published ? "#111827" : "#f3f3f3",
            color: published ? "#fff" : "#888",
            cursor: published && !unpublishing ? "pointer" : "default",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Open Customer View ↗
        </button>

        {published && (
          <button
            type="button"
            onClick={unpublishGame}
            disabled={unpublishing}
            title="Stop public access to this game"
            style={{
              padding: "8px 11px",
              border: "1px solid #dc2626",
              borderRadius: 8,
              background: "#fff",
              color: "#b91c1c",
              cursor: unpublishing ? "default" : "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {unpublishing ? "Unpublishing..." : "Unpublish"}
          </button>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 8, color: "#b91c1c", fontSize: 13 }}>
          {error}
        </div>
      )}
    </div>
  );
}
