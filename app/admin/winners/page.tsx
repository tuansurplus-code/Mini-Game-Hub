"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type ReportRow = {
  session_id: string;
  played_at: string;
  mobile: string;
  campaign_name: string;
  game_name: string;
  public_slug: string;
  result_type: string;
  prize_name: string | null;
  coupon_code: string | null;
  coupon_status: string | null;
};

export default function WinnersPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [gameFilter, setGameFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");

  useEffect(() => {
    async function loadReporting() {
      const { data, error } = await supabase.rpc("get_game_reporting");
      if (error) setError(error.message);
      else setRows(data ?? []);
      setLoading(false);
    }
    loadReporting();
  }, []);

  const campaigns = useMemo(() => Array.from(new Set(rows.map((row) => row.campaign_name))).sort(), [rows]);
  const games = useMemo(() => Array.from(new Set(rows.map((row) => row.game_name))).sort(), [rows]);

  const filteredRows = useMemo(() => rows.filter((row) =>
    (campaignFilter === "all" || row.campaign_name === campaignFilter) &&
    (gameFilter === "all" || row.game_name === gameFilter) &&
    (resultFilter === "all" || row.result_type === resultFilter)
  ), [rows, campaignFilter, gameFilter, resultFilter]);

  const summary = useMemo(() => {
    const completed = filteredRows.filter((row) => row.result_type === "win" || row.result_type === "no_prize" || row.result_type === "completed");
    const wins = filteredRows.filter((row) => row.result_type === "win").length;
    const noPrize = filteredRows.filter((row) => row.result_type === "no_prize").length;
    return {
      totalSpins: completed.length,
      wins,
      noPrize,
      winningRate: completed.length ? ((wins / completed.length) * 100).toFixed(1) : "0.0",
    };
  }, [filteredRows]);

  const cardStyle = { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "20px", boxShadow: "0 4px 14px rgba(0,0,0,0.05)" };
  const selectStyle = { minWidth: "180px", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "10px", background: "#fff" };

  return (
    <div>
      <div className="admin-header">
        <div>
          <p className="eyebrow">REPORTING</p>
          <h1>Game Reporting</h1>
          <p>Monitor spins, winning performance and prize results across campaigns.</p>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {!loading && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
            <select value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)} style={selectStyle} aria-label="Campaign filter">
              <option value="all">All Campaigns</option>
              {campaigns.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <select value={gameFilter} onChange={(e) => setGameFilter(e.target.value)} style={selectStyle} aria-label="Game filter">
              <option value="all">All Games</option>
              {games.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} style={selectStyle} aria-label="Result filter">
              <option value="all">All Results</option>
              <option value="win">Winning</option>
              <option value="no_prize">No Prize</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "20px" }}>
            <div style={cardStyle}><div style={{ fontSize: "13px", color: "#6b7280", fontWeight: 700 }}>TOTAL SPINS</div><div style={{ fontSize: "30px", fontWeight: 900, marginTop: "6px" }}>{summary.totalSpins}</div></div>
            <div style={cardStyle}><div style={{ fontSize: "13px", color: "#6b7280", fontWeight: 700 }}>WINS</div><div style={{ fontSize: "30px", fontWeight: 900, marginTop: "6px" }}>{summary.wins}</div></div>
            <div style={cardStyle}><div style={{ fontSize: "13px", color: "#6b7280", fontWeight: 700 }}>NO-PRIZE RESULTS</div><div style={{ fontSize: "30px", fontWeight: 900, marginTop: "6px" }}>{summary.noPrize}</div></div>
            <div style={cardStyle}><div style={{ fontSize: "13px", color: "#6b7280", fontWeight: 700 }}>WINNING RATE</div><div style={{ fontSize: "30px", fontWeight: 900, marginTop: "6px" }}>{summary.winningRate}%</div></div>
          </div>
        </>
      )}

      <div className="admin-panel">
        <div style={{ marginBottom: "18px" }}>
          <h2 style={{ margin: 0 }}>Spin History</h2>
          <p style={{ margin: "6px 0 0", color: "#6b7280" }}>Detailed completed spin results, prizes and coupon activity.</p>
        </div>
        {loading ? <p>Loading reporting data...</p> : filteredRows.length === 0 ? <p className="empty">No spin records match the selected filters.</p> : (
          <div className="overflow-x-auto">
            <table>
              <thead><tr><th>Date &amp; Time</th><th>Mobile</th><th>Campaign</th><th>Game</th><th>Result</th><th>Prize</th><th>Coupon</th><th>Status</th></tr></thead>
              <tbody>{filteredRows.map((row) => (
                <tr key={row.session_id}>
                  <td>{new Date(row.played_at).toLocaleString()}</td><td>{row.mobile}</td><td>{row.campaign_name}</td><td>{row.game_name}</td>
                  <td><strong>{row.result_type === "win" ? "Winning" : row.result_type === "no_prize" ? "No Prize" : row.result_type}</strong></td>
                  <td>{row.prize_name || "—"}</td><td>{row.coupon_code || "—"}</td><td>{row.coupon_status || "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
