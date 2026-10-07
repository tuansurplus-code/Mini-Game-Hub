"use client";

import { ReactNode, useState } from "react";

type TabId = "general" | "landing" | "public";
type Props = { general: ReactNode; landing: ReactNode; publicAccess: ReactNode };

const tabs: { id: TabId; label: string; description: string }[] = [
  { id: "general", label: "General & Games", description: "Campaign details, scheduling and assigned games" },
  { id: "landing", label: "Landing Page", description: "Customer campaign page design and content" },
  { id: "public", label: "Public Access", description: "Campaign and individual game customer links" },
];

export default function CampaignEditTabs({ general, landing, publicAccess }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const content = activeTab === "general" ? general : activeTab === "landing" ? landing : publicAccess;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: 6, marginBottom: 20, border: "1px solid #e5e7eb", borderRadius: 12, background: "#f8fafc" }}>
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-selected={active}
              style={{
                flex: "1 1 190px",
                padding: "11px 14px",
                border: active ? "1px solid #111827" : "1px solid transparent",
                borderRadius: 9,
                background: active ? "#111827" : "transparent",
                color: active ? "#fff" : "#374151",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>{tab.label}</div>
              <div style={{ marginTop: 3, fontSize: 11, opacity: active ? 0.75 : 0.65 }}>{tab.description}</div>
            </button>
          );
        })}
      </div>
      <div>{content}</div>
    </div>
  );
}
