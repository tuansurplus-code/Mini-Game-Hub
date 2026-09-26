"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Counts = {
  workspaces: number;
  games: number;
  campaigns: number;
  winners: number;
};

export default function AdminDashboard() {
  const [counts, setCounts] = useState<Counts>({
    workspaces: 0,
    games: 0,
    campaigns: 0,
    winners: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      const results = await Promise.all([
        supabase
          .from("workspaces")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("games")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("campaigns")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("winners")
          .select("*", { count: "exact", head: true }),
      ]);

      const failed = results.find((result) => result.error);

      if (failed?.error) {
        setError(failed.error.message);
      } else {
        setCounts({
          workspaces: results[0].count ?? 0,
          games: results[1].count ?? 0,
          campaigns: results[2].count ?? 0,
          winners: results[3].count ?? 0,
        });
      }

      setLoading(false);
    }

    loadDashboard();
  }, []);

  const cards = [
    {
      label: "Workspaces",
      value: counts.workspaces,
    },
    {
      label: "Games",
      value: counts.games,
    },
    {
      label: "Campaigns",
      value: counts.campaigns,
    },
    {
      label: "Winners",
      value: counts.winners,
    },
  ];

  return (
    <div>
      <div className="admin-header">
        <div>
          <p className="eyebrow">CONTROL CENTER</p>

          <h1>Dashboard</h1>

          <p>
            Manage games, campaigns, prizes and winners.
          </p>
        </div>

        <span className="status-pill">
          {error ? "Connection issue" : "Supabase connected"}
        </span>
      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      <div className="stats-grid">
        {cards.map((card) => (
          <div className="stat-card" key={card.label}>
            <span>{card.label}</span>

            <strong>
              {loading ? "—" : card.value}
            </strong>
          </div>
        ))}
      </div>

      <div className="admin-panel">
        <h2>Getting Started</h2>

        <p>
          Create a game first, then create a campaign and
          attach the game to it. Prizes are managed per
          campaign game.
        </p>
      </div>
    </div>
  );
}
