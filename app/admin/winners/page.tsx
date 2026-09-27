"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Winner = {
  id: string;
  won_at: string;
  mobile: string;
  campaign_name: string;
  game_name: string;
  prize_name: string;
  public_slug: string;
  coupon_code: string | null;
  coupon_status: string | null;
};

export default function WinnersPage() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadWinners() {
      const { data, error } = await supabase.rpc(
        "get_winner_history"
      );

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
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Mobile</th>
                  <th>Campaign</th>
                  <th>Game</th>
                  <th>Prize</th>
                  <th>Coupon</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {winners.map((winner) => (
                  <tr key={winner.id}>
                    <td>
                      {new Date(
                        winner.won_at
                      ).toLocaleString()}
                    </td>

                    <td>{winner.mobile}</td>

                    <td>{winner.campaign_name}</td>

                    <td>{winner.game_name}</td>

                    <td>{winner.prize_name}</td>

                    <td>
                      {winner.coupon_code || "—"}
                    </td>

                    <td>
                      {winner.coupon_status || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
