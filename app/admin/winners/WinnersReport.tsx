"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type WinnerRow = {
  session_id: string;
  played_at: string;
  mobile: string;
  customer_name: string | null;
  customer_email: string | null;
  campaign_name: string;
  game_name: string;
  result_type: string;
  prize_name: string | null;
  claimed_at: string | null;
  coupon_code: string | null;
  coupon_status: string | null;
};
type Props = { workspaceId: string; initialCampaign: string };

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("en-LK", { timeZone: "Asia/Colombo" }) : "—";
}

export default function WinnersReport({ workspaceId, initialCampaign }: Props) {
  const [rows, setRows] = useState<WinnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [campaignFilter, setCampaignFilter] = useState(initialCampaign || "all");
  const [gameFilter, setGameFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadWinners = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: reportError } = await supabase.rpc("get_workspace_reporting", {
      p_workspace_id: workspaceId,
      p_from: null,
      p_to_exclusive: null,
    });
    if (reportError) {
      setRows([]);
      setError(reportError.message);
    } else {
      setRows(((data ?? []) as WinnerRow[]).filter((row) => row.result_type === "win"));
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => { void loadWinners(); }, [loadWinners]);

  const campaigns = useMemo(() => Array.from(new Set(rows.map((row) => row.campaign_name))).sort(), [rows]);
  const games = useMemo(() => Array.from(new Set(rows.map((row) => row.game_name))).sort(), [rows]);
  const filteredRows = useMemo(() => rows.filter((row) => {
    const playedAt = new Date(row.played_at);
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00+05:30`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999+05:30`) : null;
    return (campaignFilter === "all" || row.campaign_name === campaignFilter) &&
      (gameFilter === "all" || row.game_name === gameFilter) &&
      (!from || playedAt >= from) && (!to || playedAt <= to);
  }), [rows, campaignFilter, gameFilter, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const claimed = filteredRows.filter((row) => Boolean(row.claimed_at)).length;
    const redeemed = filteredRows.filter((row) => row.coupon_status === "redeemed").length;
    return {
      winners: filteredRows.length,
      claimed,
      pending: filteredRows.length - claimed,
      redeemed,
    };
  }, [filteredRows]);

  function clearFilters() {
    setCampaignFilter("all");
    setGameFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  function exportCsv() {
    if (!filteredRows.length) return;
    const fields: { label: string; value: (row: WinnerRow) => string | null }[] = [
      { label: "Date & Time", value: (row) => formatDate(row.played_at) },
      { label: "Campaign", value: (row) => row.campaign_name },
      { label: "Game", value: (row) => row.game_name },
      { label: "Mobile Number", value: (row) => row.mobile },
      { label: "Name", value: (row) => row.customer_name },
      { label: "Email", value: (row) => row.customer_email },
      { label: "Prize", value: (row) => row.prize_name },
      { label: "Claim Status", value: (row) => row.claimed_at ? "Claimed" : "Not claimed" },
      { label: "Claimed At", value: (row) => row.claimed_at ? formatDate(row.claimed_at) : null },
      { label: "Coupon Code", value: (row) => row.coupon_code },
      { label: "Coupon Status", value: (row) => row.coupon_status },
    ];
    const escape = (input: string | null) => {
      const value = String(input ?? "");
      const safe = /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const csv = "\uFEFF" + fields.map((field) => escape(field.label)).join(",") + "\n" +
      filteredRows.map((row) => fields.map((field) => escape(field.value(row))).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `winner-history-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  const inputStyle = { minWidth: "160px", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "9px", background: "#fff" };
  const buttonStyle = { padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "9px", background: "#fff", cursor: "pointer", fontWeight: 700 };
  const cards: [string, number][] = [
    ["Winners", summary.winners],
    ["Claims Completed", summary.claimed],
    ["Claims Pending", summary.pending],
    ["Coupons Redeemed", summary.redeemed],
  ];

  return <div>
    <div className="admin-header">
      <div><p className="eyebrow">WINNER HISTORY</p><h1>Winner History</h1>
        <p>Winning entries, prize claims and coupon redemption status.</p></div>
    </div>
    {error && <div className="error-box">{error}</div>}

    <div className="admin-panel" style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end" }}>
        <label style={{ display: "grid", gap: 4, fontSize: 12, color: "#6b7280" }}>Campaign
          <select value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)} style={inputStyle}>
            <option value="all">All Campaigns</option>
            {campaigns.map((campaign) => <option key={campaign}>{campaign}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 12, color: "#6b7280" }}>Game
          <select value={gameFilter} onChange={(event) => setGameFilter(event.target.value)} style={inputStyle}>
            <option value="all">All Games</option>
            {games.map((game) => <option key={game}>{game}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 12, color: "#6b7280" }}>From
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 12, color: "#6b7280" }}>To
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} style={inputStyle} />
        </label>
        <button type="button" style={buttonStyle} onClick={clearFilters}>Clear Filters</button>
        <button type="button" style={{ ...buttonStyle, background: "#111827", color: "#fff", opacity: filteredRows.length ? 1 : 0.55 }}
          disabled={!filteredRows.length || loading} onClick={exportCsv}>Export Winners CSV</button>
      </div>
      <p style={{ margin: "12px 0 0", color: "#6b7280", fontSize: 13 }}>
        {loading ? "Loading winner history…" : `Showing ${filteredRows.length} winning entries. The export uses the selected filters.`}
      </p>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 18 }}>
      {cards.map(([label, value]) => <div key={label} className="admin-panel" style={{ margin: 0 }}>
        <div style={{ color: "#6b7280", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{value}</div>
      </div>)}
    </div>

    <div className="admin-panel">
      <h2 style={{ marginTop: 0 }}>Winning Entries</h2>
      {loading ? <p>Loading winner history…</p> : filteredRows.length === 0 ? <p className="empty">No winning entries match the selected filters.</p> :
        <div className="overflow-x-auto"><table>
          <thead><tr><th>Date & Time</th><th>Campaign</th><th>Game</th><th>Mobile</th><th>Name</th><th>Prize</th><th>Claim Status</th><th>Claimed At</th><th>Coupon</th><th>Coupon Status</th></tr></thead>
          <tbody>{filteredRows.map((row) => <tr key={row.session_id}>
            <td>{formatDate(row.played_at)}</td><td>{row.campaign_name}</td><td>{row.game_name}</td>
            <td>{row.mobile || "—"}</td><td>{row.customer_name || "—"}</td><td>{row.prize_name || "—"}</td>
            <td>{row.claimed_at ? "Claimed" : "Not claimed"}</td><td>{formatDate(row.claimed_at)}</td>
            <td>{row.coupon_code || "—"}</td><td>{row.coupon_status || "—"}</td>
          </tr>)}</tbody>
        </table></div>}
    </div>
  </div>;
}
