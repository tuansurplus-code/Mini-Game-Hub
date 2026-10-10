"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

export type CampaignOption = { id: string; name: string; status: string };
type ReportRow = {
  session_id: string;
  played_at: string;
  participant_id: string;
  campaign_id: string;
  campaign_name: string;
  result_type: string;
  claimed_at: string | null;
  coupon_code: string | null;
  coupon_status: string | null;
};
type Props = { workspaceId: string; campaigns: CampaignOption[] };
type CampaignMetrics = CampaignOption & {
  participants: number;
  plays: number;
  winners: number;
  claims: number;
  coupons: number;
  redeemed: number;
};

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

  const metrics = useMemo<CampaignMetrics[]>(() =>
    campaigns
      .filter((campaign) => campaignFilter === "all" || campaign.id === campaignFilter)
      .map((campaign) => {
        const campaignRows = rows.filter((row) => row.campaign_id === campaign.id);
        const winners = campaignRows.filter((row) => row.result_type === "win");
        const coupons = campaignRows.filter((row) => Boolean(row.coupon_code));
        return {
          ...campaign,
          participants: new Set(campaignRows.map((row) => row.participant_id)).size,
          plays: campaignRows.filter(isCompleted).length,
          winners: winners.length,
          claims: winners.filter((row) => Boolean(row.claimed_at)).length,
          coupons: coupons.length,
          redeemed: coupons.filter((row) => row.coupon_status === "redeemed").length,
        };
      }),
    [campaigns, campaignFilter, rows]
  );

  const totals = useMemo(() => metrics.reduce((sum, campaign) => ({
    participants: sum.participants + campaign.participants,
    plays: sum.plays + campaign.plays,
    winners: sum.winners + campaign.winners,
    claims: sum.claims + campaign.claims,
    coupons: sum.coupons + campaign.coupons,
    redeemed: sum.redeemed + campaign.redeemed,
  }), { participants: 0, plays: 0, winners: 0, claims: 0, coupons: 0, redeemed: 0 }), [metrics]);

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setCampaignFilter("all");
    void loadReport("", "");
  }

  function exportCsv() {
    if (!metrics.length) return;
    const fields: { label: string; value: (row: CampaignMetrics) => string | number }[] = [
      { label: "Campaign", value: (row) => row.name },
      { label: "Status", value: (row) => row.status },
      { label: "Participants", value: (row) => row.participants },
      { label: "Completed Plays", value: (row) => row.plays },
      { label: "Winners", value: (row) => row.winners },
      { label: "Claims", value: (row) => row.claims },
      { label: "Coupons Issued", value: (row) => row.coupons },
      { label: "Coupons Redeemed", value: (row) => row.redeemed },
    ];
    const escape = (input: string | number) => {
      const value = String(input);
      const safe = /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const csv = "\uFEFF" + fields.map((field) => escape(field.label)).join(",") + "\n" +
      metrics.map((row) => fields.map((field) => escape(field.value(row))).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `campaign-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  const inputStyle = { minWidth: "160px", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "9px", background: "#fff" };
  const buttonStyle = { padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "9px", background: "#fff", cursor: "pointer", fontWeight: 700 };
  const cards: [string, string | number][] = [
    ["Campaign Participants", totals.participants],
    ["Completed Plays", totals.plays],
    ["Winners", totals.winners],
    ["Claims", `${totals.claims} / ${totals.winners}`],
    ["Coupons Redeemed", `${totals.redeemed} / ${totals.coupons}`],
  ];

  return <div>
    <div className="admin-header">
      <div><p className="eyebrow">ANALYTICS</p><h1>Reports</h1>
        <p>Workspace totals and campaign performance. Open Winner History for individual winning entries.</p></div>
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
        <label style={{ display: "grid", gap: 4, fontSize: 12, color: "#6b7280" }}>From
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 12, color: "#6b7280" }}>To
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} style={inputStyle} />
        </label>
        <button type="button" style={{ ...buttonStyle, background: "#111827", color: "#fff" }} onClick={() => void loadReport(dateFrom, dateTo)}>Apply Dates</button>
        <button type="button" style={buttonStyle} onClick={clearFilters}>Clear Filters</button>
        <button type="button" style={{ ...buttonStyle, background: "#0f766e", color: "#fff", opacity: metrics.length ? 1 : 0.55 }}
          disabled={!metrics.length || loading} onClick={exportCsv}>Export Summary CSV</button>
      </div>
      <p style={{ margin: "12px 0 0", color: "#6b7280", fontSize: 13 }}>
        {loading ? "Loading report data…" : `Summary for ${metrics.length} campaign${metrics.length === 1 ? "" : "s"}.`}
      </p>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 18 }}>
      {cards.map(([label, value]) => <div key={label} className="admin-panel" style={{ margin: 0 }}>
        <div style={{ color: "#6b7280", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{value}</div>
      </div>)}
    </div>

    <div className="admin-panel">
      <h2 style={{ marginTop: 0 }}>Campaign Performance</h2>
      {loading ? <p>Loading campaign performance…</p> : metrics.length === 0 ? <p className="empty">No campaigns are available in this workspace.</p> :
        <div className="overflow-x-auto"><table>
          <thead><tr><th>Campaign</th><th>Status</th><th>Participants</th><th>Completed Plays</th><th>Winners</th><th>Claims</th><th>Coupons Issued</th><th>Redeemed</th></tr></thead>
          <tbody>{metrics.map((campaign) => <tr key={campaign.id}>
            <td><strong>{campaign.name}</strong></td><td>{campaign.status}</td><td>{campaign.participants}</td>
            <td>{campaign.plays}</td><td>{campaign.winners}</td>
            <td>{campaign.claims} / {campaign.winners}</td><td>{campaign.coupons}</td>
            <td>{campaign.redeemed} / {campaign.coupons}</td>
          </tr>)}</tbody>
        </table></div>}
    </div>
  </div>;
}
