"use client";

import { useEffect, useMemo, useState } from "react";
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
      const { data, error } = await supabase.rpc("get_winner_history");
      if (error) setError(error.message);
      else setWinners(data ?? []);
      setLoading(false);
    }
    loadWinners();
  }, []);

  const summary = useMemo(() => {
    const uniqueMobiles = new Set(winners.map((winner) => winner.mobile));
    const activeCoupons = winners.filter((winner) => winner.coupon_status === "active").length;
    const redeemedCoupons = winners.filter((winner) => winner.coupon_status === "redeemed").length;
    return {
      totalWinners: winners.length,
      uniqueWinners: uniqueMobiles.size,
      activeCoupons,
      redeemedCoupons,
    };
  }, [winners]);

  const cardStyle = {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
  };

  return (
    <div>
      <div className="admin-header">
        <div>
          <p className="eyebrow">REPORTING</p>
          <h1>Game Reporting</h1>
          <p>Monitor winners, prizes and coupon activity across your campaigns.</p>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "20px" }}>
          <div style={cardStyle}>
            <div style={{ fontSize: "13px", color: "#6b7280", fontWeight: 700 }}>TOTAL WINS</div>
            <div style={{ fontSize: "30px", fontWeight: 900, marginTop: "6px" }}>{summary.totalWinners}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: "13px", color: "#6b7280", fontWeight: 700 }}>UNIQUE WINNERS</div>
            <div style={{ fontSize: "30px", fontWeight: 900, marginTop: "6px" }}>{summary.uniqueWinners}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: "13px", color: "#6b7280", fontWeight: 700 }}>ACTIVE COUPONS</div>
            <div style={{ fontSize: "30px", fontWeight: 900, marginTop: "6px" }}>{summary.activeCoupons}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: "13px", color: "#6b7280", fontWeight: 700 }}>REDEEMED COUPONS</div>
            <div style={{ fontSize: "30px", fontWeight: 900, marginTop: "6px" }}>{summary.redeemedCoupons}</div>
          </div>
        </div>
      )}

      <div className="admin-panel">
        <div style={{ marginBottom: "18px" }}>
          <h2 style={{ margin: 0 }}>Winner History</h2>
          <p style={{ margin: "6px 0 0", color: "#6b7280" }}>Detailed winning results and issued coupon codes.</p>
        </div>

        {loading ? (
          <p>Loading reporting data...</p>
        ) : winners.length === 0 ? (
          <p className="empty">No winners yet. Winner records will appear here when participants win prizes.</p>
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
                    <td>{new Date(winner.won_at).toLocaleString()}</td>
                    <td>{winner.mobile}</td>
                    <td>{winner.campaign_name}</td>
                    <td>{winner.game_name}</td>
                    <td><strong>{winner.prize_name}</strong></td>
                    <td>{winner.coupon_code || "—"}</td>
                    <td>{winner.coupon_status || "—"}</td>
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
