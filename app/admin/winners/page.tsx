"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Winner = {
  id: string;
  won_at: string;
  campaign_game_id: string;
  participant_id: string;
  prize_id: string;
};

export default function WinnersPage() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadWinners() {
      const { data, error } = await supabase
        .from("winners")
        .select(
          "id, won_at, campaign_game_id, participant_id, prize_id"
        )
        .order("won_at", {
          ascending: false,
        });

      if (error) {
        setError(error.message);
      } else {
        setWinners(data ?? []);
      }

      setLoading(false);
    }

    loadWinners();
  }, []);

  return (
    <div>
      <div className="admin-header">
        <div>
          <p className="eyebrow">REPORTING</p>

          <h1>Winner History</h1>

          <p>
            View participants who have won prizes across campaigns.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      <div className="admin-panel">
        {loading ? (
          <p>Loading winner history...</p>
        ) : winners.length === 0 ? (
          <p className="empty">
            No winners yet. Winner records will appear here
            when participants win prizes.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Participant</th>
                <th>Prize</th>
                <th>Campaign Game</th>
              </tr>
            </thead>

            <tbody>
              {winners.map((winner) => (
                <tr key={winner.id}>
                  <td>
                    {new Date(winner.won_at).toLocaleString()}
                  </td>

                  <td>
                    {winner.participant_id}
                  </td>

                  <td>
                    {winner.prize_id}
                  </td>

                  <td>
                    {winner.campaign_game_id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
