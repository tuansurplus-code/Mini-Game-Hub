"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Prize = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  weight: number;
  inventory: number | null;
  active: boolean;
  metadata: Record<string, unknown>;
  created_at?: string;
};

type FormMode = "add" | "edit" | null;

const DEFAULT_COLOR = "#e31b23";
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export default function CampaignPrizeColors({ campaignGameId }: { campaignGameId: string }) {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  const [mode, setMode] = useState<FormMode>(null);
  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(null);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [hexValue, setHexValue] = useState(DEFAULT_COLOR);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadPrizes = useCallback(async () => {
    const response = await fetch(`/api/admin/campaign-games/${campaignGameId}/prizes`, {
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to load prizes.");
    const loaded = Array.isArray(result.prizes) ? (result.prizes as Prize[]) : [];
    setPrizes(loaded);
    return loaded;
  }, [campaignGameId]);

  useEffect(() => {
    loadPrizes().catch(() => undefined);
  }, [loadPrizes]);

  useEffect(() => {
    function findPrizeForm() {
      const nameInput = document.querySelector<HTMLInputElement>(
        'input[placeholder="Example: Rs. 1,000 Voucher"]'
      );

      if (!nameInput) {
        setTarget(null);
        setForm(null);
        setMode(null);
        setSelectedPrizeId(null);
        return;
      }

      const prizeForm = nameInput.closest("form");
      if (!prizeForm) return;

      const submitButton = prizeForm.querySelector<HTMLButtonElement>('button[type="submit"]');
      const buttonText = submitButton?.textContent?.trim() || "";
      const nextMode: FormMode = buttonText.includes("Add Prize") || buttonText.includes("Adding")
        ? "add"
        : buttonText.includes("Save Changes") || buttonText.includes("Saving")
        ? "edit"
        : null;

      if (!nextMode) return;

      const fieldsContainer = nameInput.parentElement?.parentElement;
      if (!(fieldsContainer instanceof HTMLElement)) return;

      setTarget(fieldsContainer);
      setForm(prizeForm);
      setMode(nextMode);

      if (nextMode === "add") {
        setSelectedPrizeId(null);
        setColor(DEFAULT_COLOR);
        setHexValue(DEFAULT_COLOR);
        setMessage("");
        return;
      }

      const prizeName = nameInput.value.trim();
      const matchingPrize = prizes.find((prize) => prize.name === prizeName);
      setSelectedPrizeId(matchingPrize?.id || null);
      const existingColor =
        matchingPrize && typeof matchingPrize.metadata?.segment_color === "string" && HEX_COLOR.test(matchingPrize.metadata.segment_color)
          ? matchingPrize.metadata.segment_color
          : DEFAULT_COLOR;
      setColor(existingColor);
      setHexValue(existingColor);
      setMessage("");
    }

    findPrizeForm();
    const observer = new MutationObserver(findPrizeForm);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [prizes]);

  const savePrizeColor = useCallback(
    async (prize: Prize, nextColor: string) => {
      const metadata = { ...(prize.metadata || {}), segment_color: nextColor };
      const response = await fetch(`/api/admin/campaign-games/${campaignGameId}/prizes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prize_id: prize.id,
          name: prize.name,
          description: prize.description,
          image_url: prize.image_url,
          weight: prize.weight,
          inventory: prize.inventory,
          active: prize.active,
          metadata,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save wheel color.");
      return result.prize as Prize;
    },
    [campaignGameId]
  );

  useEffect(() => {
    if (!form || !mode) return;

    async function afterSubmit(event: Event) {
      const submittedForm = event.currentTarget as HTMLFormElement;
      const nameInput = submittedForm.querySelector<HTMLInputElement>(
        'input[placeholder="Example: Rs. 1,000 Voucher"]'
      );
      const submittedName = nameInput?.value.trim() || "";
      const submittedColor = color;
      const submittedPrizeId = selectedPrizeId;

      if (!HEX_COLOR.test(submittedColor)) return;

      setSaving(true);
      setMessage("Saving wheel color...");

      // Let the existing Add/Edit request finish first so its metadata update cannot
      // overwrite the segment color. Then update the same prize through the existing API.
      await new Promise((resolve) => setTimeout(resolve, 900));

      try {
        let latest: Prize[] = [];
        for (let attempt = 0; attempt < 5; attempt += 1) {
          latest = await loadPrizes();
          const found = mode === "edit"
            ? latest.find((prize) => prize.id === submittedPrizeId)
            : [...latest]
                .filter((prize) => prize.name === submittedName)
                .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))[0];

          if (found) {
            const saved = await savePrizeColor(found, submittedColor);
            setPrizes((current) => current.map((item) => (item.id === saved.id ? saved : item)));
            setMessage("Wheel color saved.");
            setSaving(false);
            return;
          }

          await new Promise((resolve) => setTimeout(resolve, 350));
        }

        setMessage("Prize saved. Reopen Edit to set the wheel color.");
      } catch {
        setMessage("Prize saved, but the wheel color could not be updated.");
      } finally {
        setSaving(false);
      }
    }

    form.addEventListener("submit", afterSubmit);
    return () => form.removeEventListener("submit", afterSubmit);
  }, [form, mode, color, selectedPrizeId, loadPrizes, savePrizeColor]);

  function setValidColor(nextColor: string) {
    setHexValue(nextColor);
    if (HEX_COLOR.test(nextColor)) {
      setColor(nextColor);
      setMessage("");
    }
  }

  if (!target || !mode) return null;

  return createPortal(
    <div
      style={{
        padding: "14px",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        background: "#f9fafb",
      }}
    >
      <label style={{ display: "block", fontWeight: 700, marginBottom: "8px" }}>
        Wheel Segment Color
      </label>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <input
          type="color"
          value={color}
          disabled={saving}
          onChange={(event) => {
            setColor(event.target.value);
            setHexValue(event.target.value);
            setMessage("");
          }}
          aria-label="Wheel segment color"
          style={{
            width: "54px",
            height: "44px",
            padding: "2px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            background: "#ffffff",
          }}
        />

        <input
          type="text"
          value={hexValue}
          disabled={saving}
          onChange={(event) => setValidColor(event.target.value)}
          placeholder="#e31b23"
          maxLength={7}
          style={{
            width: "120px",
            padding: "11px 12px",
            border: `1px solid ${HEX_COLOR.test(hexValue) ? "#d1d5db" : "#ef4444"}`,
            borderRadius: "9px",
            boxSizing: "border-box",
            fontFamily: "monospace",
          }}
        />

        <span
          aria-hidden="true"
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "999px",
            background: color,
            border: "1px solid rgba(0,0,0,.12)",
          }}
        />
      </div>

      <div style={{ marginTop: "7px", fontSize: "12px", color: "#6b7280", lineHeight: 1.5 }}>
        This color is used for this prize&apos;s segment on the Spin &amp; Win wheel.
      </div>

      {message && (
        <div style={{ marginTop: "7px", fontSize: "12px", color: "#6b7280" }}>
          {message}
        </div>
      )}
    </div>,
    target
  );
}
