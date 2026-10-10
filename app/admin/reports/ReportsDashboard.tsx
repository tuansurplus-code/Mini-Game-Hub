"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

export type CampaignOption = { id: string; name: string; status: string };
type ReportRow = {
  session_id: string; played_at: string; participant_id: string; mobile: string;
  customer_name: string | null; customer_email: string | null; customer_address: string | null;
  campaign_id: string; campaign_name: string; game_id: string; game_name: string; public_slug: string;
  result_type: string; prize_name: string | null; claimed_at: string | null;
  coupon_code: string | null; coupon_status: string | null;
};
type Props = { workspaceId: string; campaigns: CampaignOption[] };

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("en-LK", { timeZone: "Asia/Colombo" }) : "—";
}
function isCompleted(row: ReportRow) {
  return ["win", "no_prize", "completed"].includes(row.result_type);
}

export default function ReportsDashboard({ workspaceId, campaigns }: Props) {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [gameFilter, setGameFilter] = useState("all");

  const loadReport = useCallback(async (from: string, to: string) => {
    if (from && to && from > to) {
      setError("The start date must be on or before the end date.");
      return;
    }
    setLoading(true);
    setError("");
    const fromTimestamp = from ? new Date(`${from}T00:00:00+05:30`).toISOString() : null;
    let toTimestamp: string | null = null;
    if (to) {
      const nextDay = new Date(`${to}T00:00:00+05:30`);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      toTimestamp = nextDay.toISOString();
    }
    const { data, error: reportError } = await supabase.rpc("get_workspace_reporting", {
      p_workspace_id: workspaceId,
      p_from: fromTimestamp,
      p_to_exclusive: toTimestamp,
    });
    if (reportError) {
      setRows([]);
      setError(reportError.message);
    } else {
      setRows((data ?? []) as ReportRow[]);
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => { void loadReport("", ""); }, [loadReport]);

  const visibleRows = useMemo(
    () => rows.filter((row) =>
      (campaignFilter === "all" || row.campaign_id === campaignFilter) &&
      (gameFilter === "all" || row.game_id === gameFilter)
    ),
    [rows, campaignFilter, gameFilter]
  );
  const games = useMemo(() => {
    const seen = new Map<string, string>();
    rows.forEach((row) => seen.set(row.game_id, row.game_name));
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);
  const summary = useMemo(() => {
    const completed = visibleRows.filter(isCompleted);
    const winners = visibleRows.filter((row) => row.result_type === "win");
    const claims = winners.filter((row) => Boolean(row.claimed_at));
    const coupons = visibleRows.filter((row) => Boolean(row.coupon_code));
    const redeemed = coupons.filter((row) => row.coupon_status === "redeemed");
    return {
      participants: new Set(visibleRows.map((row) => row.participant_id)).size,
      plays: completed.length,
      winners: winners.length,
      claims: claims.length,
      claimRate: winners.length ? (claims.length / winners.length * 100).toFixed(1) : "0.0",
      coupons: coupons.length,
      redeemed: redeemed.length,
      redemptionRate: coupons.length ? (redeemed.length / coupons.length * 100).toFixed(1) : "0.0",
    };
  }, [visibleRows]);
  const campaignSummary = useMemo(() =>
    campaigns
      .filter((campaign) => campaignFilter === "all" || campaign.id === campaignFilter)
      .map((campaign) => {
        const campaignRows = visibleRows.filter((row) => row.campaign_id === campaign.id);
        const winners = campaignRows.filter((row) => row.result_type === "win");
        const coupons = campaignRows.filter((row) => Boolean(row.coupon_code));
        return {
          ...campaign,
          participants: new Set(campaignRows.map((row) => row.participant_id)).size,
          plays: campaignRows.filter(isCompleted).length,
          winners: winners.length,
          claims: winners.filter((row) => Boolean(row.claimed_at)).length,
          redeemed: coupons.filter((row) => row.coupon_status === "redeemed").length,
        };
      }),
    [campaigns, campaignFilter, visibleRows]
  );

  function clearFilters() {
    setDateFrom(""); setDateTo(""); setCampaignFilter("all"); setGameFilter("all");
    void loadReport("", "");
  }
  function exportCsv() {
    if (!visibleRows.length) return;
    const fields: { label: string; value: (row: ReportRow) => string | null }[] = [
      { label: "Date & Time", value: (row) => formatDate(row.played_at) },
      { label: "Campaign", value: (row) => row.campaign_name },
      { label: "Game", value: (row) => row.game_name },
      { label: "Mobile Number", value: (row) => row.mobile },
      { label: "Name", value: (row) => row.customer_name },
      { label: "Email", value: (row) => row.customer_email },
      { label: "Result", value: (row) => row.result_type },
      { label: "Prize", value: (row) => row.prize_name },
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
      visibleRows.map((row) => fields.map((field) => escape(field.value(row))).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `campaign-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  const inputStyle = { minWidth: "160px", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "9px", background: "#fff" };
  const buttonStyle = { padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "9px", background: "#fff", cursor: "pointer", fontWeight: 700 };
  const cards: [string, string | number][] = [
    ["Participants", summary.participants], ["Completed Plays", summary.plays], ["Winners", summary.winners],
    ["Claims", `${summary.claims} · ${summary.claimRate}%`],
    ["Coupons Redeemed", `${summary.redeemed} / ${summary.coupons} · ${summary.redemptionRate}%`],
  ];

  return <div>
    <div className="admin-header">
      <div><p className="eyebrow">ANALYTICS</p><h1>Reports</h1>
        <p>Participation, winners, prize claims and coupon redemption for this workspace.</p></div>
    </div>
    {error && <div className="error-box">{error}</div>}

    <div className="admin-panel" style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end" }}>
        <label style={{ display: "grid", gap: 4, fontSize: 12, color: "#6b7280" }}>Campaign
          <select value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)} style={inputStyle}>
            <option value="all">All Campaigns</option>
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 12, color: "#6b7280" }}>Game
          <select value={gameFilter} onChange={(event) => setGameFilter(event.target.value)} style={inputStyle}>
            <option value="all">All Games</option>
            {games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 12, color: "#6b7280" }}>From
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 12, color: "#6b7280" }}>To
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} style={inputStyle} />
        </label>
        <button type="button" style={{ ...buttonStyle, background: "#111827", color: "#fff" }} onClick={() => void loadReport(dateFrom, dateTo)}>Apply Dates</button>
        <button type="button" style={buttonStyle} onClick={clearFilters}>Clear Filters</button>
        <button type="button" style={{ ...buttonStyle, background: "#0f766e", color: "#fff", opacity: visibleRows.length ? 1 : 0.55 }}
          disabled={!visibleRows.length || loading} onClick={exportCsv}>Export CSV</button>
      </div>
      <p style={{ margin: "12px 0 0", color: "#6b7280", fontSize: 13 }}>
        {loading ? "Loading report data…" : `Showing ${visibleRows.length} play records. The export uses the selected filters.`}
      </p>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 18 }}>
      {cards.map(([label, value]) => <div key={label} className="admin-panel" style={{ margin: 0 }}>
        <div style={{ color: "#6b7280", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{value}</div>
      </div>)}
    </div>

    <div className="admin-panel" style={{ marginBottom: 18 }}>
      <h2 style={{ marginTop: 0 }}>Campaign Performance</h2>
      {loading ? <p>Loading campaign performance…</p> : campaigns.length === 0 ? <p className="empty">No campaigns are available in this workspace.</p> :
        <div className="overflow-x-auto"><table>
          <thead><tr><th>Campaign</th><th>Status</th><th>Participants</th><th>Plays</th><th>Winners</th><th>Claims</th><th>Coupons Redeemed</th></tr></thead>
          <tbody>{campaignSummary.map((campaign) => <tr key={campaign.id}>
            <td><strong>{campaign.name}</strong></td><td>{campaign.status}</td><td>{campaign.participants}</td>
            <td>{campaign.plays}</td><td>{campaign.winners}</td><td>{campaign.claims}</td><td>{campaign.redeemed}</td>
          </tr>)}</tbody>
        </table></div>}
    </div>

    <div className="admin-panel">
      <h2 style={{ marginTop: 0 }}>Participation & Prize Activity</h2>
      {loading ? <p>Loading participation records…</p> : visibleRows.length === 0 ? <p className="empty">No records match the selected filters.</p> :
        <div className="overflow-x-auto"><table>
          <thead><tr><th>Date & Time</th><th>Campaign</th><th>Game</th><th>Mobile</th><th>Result</th><th>Prize</th><th>Claimed</th><th>Coupon</th><th>Coupon Status</th></tr></thead>
          <tbody>{visibleRows.map((row) => <tr key={row.session_id}>
            <td>{formatDate(row.played_at)}</td><td>{row.campaign_name}</td><td>{row.game_name}</td><td>{row.mobile || "—"}</td>
            <td>{row.result_type.replaceAll("_", " ")}</td><td>{row.prize_name || "—"}</td>
            <td>{row.claimed_at ? formatDate(row.claimed_at) : "No"}</td><td>{row.coupon_code || "—"}</td><td>{row.coupon_status || "—"}</td>
          </tr>)}</tbody>
        </table></div>}
    </div>
  </div>;
}
