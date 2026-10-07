"use client";

import { useEffect, useState } from "react";

type Tab = "appearance" | "prizes" | "rules" | "coupons";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "appearance", label: "Appearance" },
  { id: "prizes", label: "Prizes" },
  { id: "rules", label: "Gameplay Rules" },
  { id: "coupons", label: "Coupon Settings" },
];

function text(element: Element) {
  return (element.textContent || "").replace(/\s+/g, " ").trim();
}

function sectionFor(element: Element): Tab | null {
  const value = text(element);

  if (
    value.includes("Customer View") ||
    value.includes("Scratch Card Customization") ||
    value.includes("Wheel Customization") ||
    value.includes("Wheel Appearance") ||
    value.includes("Prize Segment Colors")
  ) return "appearance";

  if (value.includes("Prize Management")) return "prizes";
  if (value.includes("Gameplay Rules")) return "rules";
  if (value.includes("Prize Coupon Codes") || value.includes("Auto Generate Coupon Format")) return "coupons";

  return null;
}

export default function ConfigurationTabs() {
  const [active, setActive] = useState<Tab>("appearance");

  useEffect(() => {
    const root = document.querySelector(".campaign-game-configuration");
    if (!root) return;

    const apply = () => {
      const candidates = root.querySelectorAll(":scope > section, :scope > div > form > .admin-panel, :scope > form > .admin-panel");

      candidates.forEach((element) => {
        const section = sectionFor(element);
        if (!section) return;
        (element as HTMLElement).style.display = section === active ? "" : "none";
        (element as HTMLElement).dataset.configTabSection = section;
      });

      root.querySelectorAll("form").forEach((form) => {
        Array.from(form.children).forEach((element) => {
          const el = element as HTMLElement;
          if (el.classList.contains("admin-panel")) return;
          const value = text(el);
          if (value.includes("Save Configuration") && value.includes("Cancel")) {
            el.style.display = active === "rules" ? "" : "none";
            el.dataset.configTabSection = "rules";
          }
        });
      });
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [active]);

  return (
    <nav
      aria-label="Game configuration sections"
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        marginTop: 20,
        padding: 6,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
      }}
    >
      {tabs.map((tab) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            aria-selected={selected}
            role="tab"
            style={{
              border: selected ? "1px solid #111827" : "1px solid transparent",
              background: selected ? "#111827" : "transparent",
              color: selected ? "#ffffff" : "#475569",
              borderRadius: 9,
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flex: "0 0 auto",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
