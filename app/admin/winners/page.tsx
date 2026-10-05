"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type ReportRow = {
  session_id: string; played_at: string; mobile: string; campaign_name: string; game_name: string; public_slug: string;
  result_type: string; prize_name: string | null; coupon_code: string | null; coupon_status: string | null;
};

export default function WinnersPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [gameFilter, setGameFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    async function loadReporting() {
      const { data, error } = await supabase.rpc("get_game_reporting");
      if (error) setError(error.message); else setRows(data ?? []);
      setLoading(false);
    }
    loadReporting();
  }, []);

  const campaigns = useMemo(() => Array.from(new Set(rows.map((r) => r.campaign_name))).sort(), [rows]);
  const games = useMemo(() => Array.from(new Set(rows.map((r) => r.game_name))).sort(), [rows]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    const played = new Date(row.played_at);
    const fromOk = !dateFrom || played >= new Date(`${dateFrom}T00:00:00`);
    const toOk = !dateTo || played <= new Date(`${dateTo}T23:59:59.999`);
    return (campaignFilter === "all" || row.campaign_name === campaignFilter) &&
      (gameFilter === "all" || row.game_name === gameFilter) &&
      (resultFilter === "all" || row.result_type === resultFilter) && fromOk && toOk;
  }), [rows, campaignFilter, gameFilter, resultFilter, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const completed = filteredRows.filter((r) => ["win", "no_prize", "completed"].includes(r.result_type));
    const wins = filteredRows.filter((r) => r.result_type === "win").length;
    const noPrize = filteredRows.filter((r) => r.result_type === "no_prize").length;
    return { totalSpins: completed.length, wins, noPrize, winningRate: completed.length ? ((wins / completed.length) * 100).toFixed(1) : "0.0" };
  }, [filteredRows]);

  function clearFilters() {
    setCampaignFilter("all"); setGameFilter("all"); setResultFilter("all"); setDateFrom(""); setDateTo("");
  }

  function exportCsv() {
    const headers = ["Date & Time", "Mobile", "Campaign", "Game", "Result", "Prize", "Coupon", "Coupon Status"];
    const escapeCsv = (value: string | null) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = filteredRows.map((row) => [
      new Date(row.played_at).toLocaleString(), row.mobile, row.campaign_name, row.game_name,
      row.result_type === "win" ? "Winning" : row.result_type === "no_prize" ? "No Prize" : row.result_type,
      row.prize_name, row.coupon_code, row.coupon_status,
    ].map(escapeCsv).join(","));
    const csv = "\uFEFF" + headers.map(escapeCsv).join(",") + "\n" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `game-report-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    URL.revokeObjectURL(url);
  }

  const cardStyle = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "20px", boxShadow: "0 4px 14px rgba(0,0,0,.05)" };
  const inputStyle = { minWidth: "165px", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "10px", background: "#fff" };
  const buttonStyle = { padding: "10px 16px", borderRadius: "10px", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontWeight: 700 };

  return <div>
    <div className="admin-header"><div><p className="eyebrow">REPORTING</p><h1>Game Reporting</h1><p>Monitor spins, winning performance and prize results across campaigns.</p></div></div>
    {error && <div className="error-box">{error}</div>}

    {!loading && <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
        <select value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)} style={inputStyle}><option value="all">All Campaigns</option>{campaigns.map((n) => <option key={n}>{n}</option>)}</select>
        <select value={gameFilter} onChange={(e) => setGameFilter(e.target.value)} style={inputStyle}><option value="all">All Games</option>{games.map((n) => <option key={n}>{n}</option>)}</select>
        <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} style={inputStyle}><option value="all">All Results</option><option value="win">Winning</option><option value="no_prize">No Prize</option></select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} title="From date" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} title="To date" />
        <button onClick={clearFilters} style={buttonStyle}>Clear Filters</button>
        <button onClick={exportCsv} disabled={!filteredRows.length} style={{ ...buttonStyle, background: "#111827", color: "#fff", opacity: filteredRows.length ? 1 : .5 }}>Export CSV</button>
      </div>
      <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "18px" }}>Showing {filteredRows.length} record{filteredRows.length === 1 ? "" : "s"}. CSV export uses the currently selected filters.</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "14px", marginBottom: "20px" }}>
        {[['TOTAL SPINS', summary.totalSpins], ['WINS', summary.wins], ['NO-PRIZE RESULTS', summary.noPrize], ['WINNING RATE', `${summary.winningRate}%`]].map(([label, value]) =>
          <div key={label} style={cardStyle}><div style={{ fontSize: "13px", color: "#6b7280", fontWeight: 700 }}>{label}</div><div style={{ fontSize: "30px", fontWeight: 900, marginTop: "6px" }}>{value}</div></div>)}
      </div>
    </>}

    <div className="admin-panel">
      <div style={{ marginBottom: "18px" }}><h2 style={{ margin: 0 }}>Spin History</h2><p style={{ margin: "6px 0 0", color: "#6b7280" }}>Detailed completed spin results, prizes and coupon activity.</p></div>
      {loading ? <p>Loading reporting data...</p> : filteredRows.length === 0 ? <p className="empty">No spin records match the selected filters.</p> :
        <div className="overflow-x-auto"><table><thead><tr><th>Date &amp; Time</th><th>Mobile</th><th>Campaign</th><th>Game</th><th>Result</th><th>Prize</th><th>Coupon</th><th>Status</th></tr></thead>
          <tbody>{filteredRows.map((row) => <tr key={row.session_id}><td>{new Date(row.played_at).toLocaleString()}</td><td>{row.mobile}</td><td>{row.campaign_name}</td><td>{row.game_name}</td><td><strong>{row.result_type === "win" ? "Winning" : row.result_type === "no_prize" ? "No Prize" : row.result_type}</strong></td><td>{row.prize_name || "—"}</td><td>{row.coupon_code || "—"}</td><td>{row.coupon_status || "—"}</td></tr>)}</tbody>
        </table></div>}
    </div>
  </div>;
}
