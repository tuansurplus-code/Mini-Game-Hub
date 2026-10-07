"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabase";

type ReportRow = {
  session_id: string;
  played_at: string;
  mobile: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_address: string | null;
  campaign_name: string;
  game_name: string;
  public_slug: string;
  result_type: string;
  prize_name: string | null;
  coupon_code: string | null;
  coupon_status: string | null;
};

type Field = "date" | "mobile" | "name" | "email" | "address" | "game" | "result" | "prize" | "coupon" | "couponStatus";

const fields: { key: Field; label: string }[] = [
  { key: "date", label: "Date & Time" },
  { key: "mobile", label: "Mobile Number" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email Address" },
  { key: "address", label: "Address" },
  { key: "game", label: "Game" },
  { key: "result", label: "Result" },
  { key: "prize", label: "Prize" },
  { key: "coupon", label: "Coupon Code" },
  { key: "couponStatus", label: "Coupon Status" },
];

const defaultFields: Field[] = ["date", "mobile", "name", "game", "result", "prize", "coupon", "couponStatus"];

export default function CampaignReportPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [gameFilter, setGameFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tableFields, setTableFields] = useState<Field[]>(defaultFields);
  const [exportFields, setExportFields] = useState<Field[]>(fields.map((field) => field.key));
  const [showColumns, setShowColumns] = useState(false);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    const requestedCampaign = new URLSearchParams(window.location.search).get("campaign") || "";
    setCampaignName(requestedCampaign);
    async function load() {
      const { data, error } = await supabase.rpc("get_game_reporting");
      if (error) setError(error.message);
      else setRows((data ?? []) as ReportRow[]);
      setLoading(false);
    }
    load();
  }, []);

  const campaignRows = useMemo(
    () => rows.filter((row) => !campaignName || row.campaign_name === campaignName),
    [rows, campaignName]
  );
  const games = useMemo(() => Array.from(new Set(campaignRows.map((row) => row.game_name))).sort(), [campaignRows]);
  const filteredRows = useMemo(() => campaignRows.filter((row) => {
    const played = new Date(row.played_at);
    const fromOk = !dateFrom || played >= new Date(`${dateFrom}T00:00:00`);
    const toOk = !dateTo || played <= new Date(`${dateTo}T23:59:59.999`);
    return (gameFilter === "all" || row.game_name === gameFilter) &&
      (resultFilter === "all" || row.result_type === resultFilter) && fromOk && toOk;
  }), [campaignRows, gameFilter, resultFilter, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const completed = filteredRows.filter((row) => ["win", "no_prize", "completed"].includes(row.result_type));
    const wins = filteredRows.filter((row) => row.result_type === "win").length;
    const noPrize = filteredRows.filter((row) => row.result_type === "no_prize").length;
    const participants = new Set(filteredRows.map((row) => row.mobile).filter(Boolean)).size;
    const issuedCoupons = filteredRows.filter((row) => Boolean(row.coupon_code)).length;
    const redeemedCoupons = filteredRows.filter((row) => row.coupon_status === "redeemed").length;
    return {
      participants,
      spins: completed.length,
      wins,
      noPrize,
      winRate: completed.length ? ((wins / completed.length) * 100).toFixed(1) : "0.0",
      issuedCoupons,
      redeemedCoupons,
    };
  }, [filteredRows]);

  const prizeBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; wins: number; coupons: number; redeemed: number }>();
    filteredRows.filter((row) => row.result_type === "win").forEach((row) => {
      const name = row.prize_name || "Unnamed Prize";
      const item = map.get(name) || { name, wins: 0, coupons: 0, redeemed: 0 };
      item.wins += 1;
      if (row.coupon_code) item.coupons += 1;
      if (row.coupon_status === "redeemed") item.redeemed += 1;
      map.set(name, item);
    });
    return Array.from(map.values()).sort((a, b) => b.wins - a.wins);
  }, [filteredRows]);

  function value(row: ReportRow, field: Field) {
    if (field === "date") return new Date(row.played_at).toLocaleString("en-LK", { timeZone: "Asia/Colombo" });
    if (field === "mobile") return row.mobile;
    if (field === "name") return row.customer_name;
    if (field === "email") return row.customer_email;
    if (field === "address") return row.customer_address;
    if (field === "game") return row.game_name;
    if (field === "result") return row.result_type === "win" ? "Winning" : row.result_type === "no_prize" ? "No Prize" : row.result_type;
    if (field === "prize") return row.prize_name;
    if (field === "coupon") return row.coupon_code;
    return row.coupon_status;
  }

  function toggle(field: Field, current: Field[], setter: (next: Field[]) => void) {
    setter(current.includes(field) ? current.filter((item) => item !== field) : [...current, field]);
  }

  function exportCsv() {
    if (!filteredRows.length || !exportFields.length) return;
    const selected = fields.filter((field) => exportFields.includes(field.key));
    const escape = (input: string | null | undefined) => `"${String(input ?? "").replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + selected.map((field) => escape(field.label)).join(",") + "\n" +
      filteredRows.map((row) => selected.map((field) => escape(value(row, field.key))).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(campaignName || "campaign").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setShowExport(false);
  }

  const card = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "18px" };
  const input = { minWidth: "160px", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "9px", background: "#fff" };
  const button = { padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "9px", background: "#fff", cursor: "pointer", fontWeight: 700 };
  const selectedColumns = fields.filter((field) => tableFields.includes(field.key));

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"16px",marginBottom:"22px"}}>
      <div><p className="eyebrow">CAMPAIGN REPORT</p><h1 style={{marginBottom:"6px"}}>{campaignName || "Campaign Report"}</h1><p style={{margin:0,color:"#6b7280"}}>Campaign performance, prize results, coupons and customer activity.</p></div>
      <Link href="/admin/campaigns" className="secondary-btn" style={{textDecoration:"none"}}>Back to Campaigns</Link>
    </div>
    {error && <div className="error-box">{error}</div>}
    {!campaignName && !loading && <div className="error-box">No campaign was selected.</div>}
    {!loading && <>
      <div style={{display:"flex",flexWrap:"wrap",gap:"10px",marginBottom:"18px"}}>
        <select value={gameFilter} onChange={(e)=>setGameFilter(e.target.value)} style={input}><option value="all">All Games</option>{games.map((game)=><option key={game}>{game}</option>)}</select>
        <select value={resultFilter} onChange={(e)=>setResultFilter(e.target.value)} style={input}><option value="all">All Results</option><option value="win">Winning</option><option value="no_prize">No Prize</option></select>
        <input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} style={input}/><input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} style={input}/>
        <button style={button} onClick={()=>{setGameFilter("all");setResultFilter("all");setDateFrom("");setDateTo("");}}>Clear Filters</button>
        <button style={button} onClick={()=>setShowColumns(true)}>Table Columns</button>
        <button style={{...button,background:"#111827",color:"#fff",opacity:filteredRows.length?1:.5}} disabled={!filteredRows.length} onClick={()=>setShowExport(true)}>Export CSV</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:"12px",marginBottom:"20px"}}>
        {[["Participants",summary.participants],["Spins",summary.spins],["Winners",summary.wins],["No Prize",summary.noPrize],["Win Rate",`${summary.winRate}%`],["Coupons Issued",summary.issuedCoupons],["Coupons Redeemed",summary.redeemedCoupons]].map(([label,val])=><div key={label} style={card}><div style={{fontSize:"12px",fontWeight:700,color:"#6b7280",textTransform:"uppercase"}}>{label}</div><div style={{fontSize:"28px",fontWeight:900,marginTop:"5px"}}>{val}</div></div>)}
      </div>
      <div className="admin-panel" style={{marginBottom:"20px"}}><h2 style={{marginTop:0}}>Prize Performance</h2>{prizeBreakdown.length===0?<p className="empty">No winning prize results match the selected filters.</p>:<div style={{overflowX:"auto"}}><table><thead><tr><th>Prize</th><th>Wins</th><th>Share of Wins</th><th>Coupons Issued</th><th>Coupons Redeemed</th></tr></thead><tbody>{prizeBreakdown.map((prize)=><tr key={prize.name}><td><strong>{prize.name}</strong></td><td>{prize.wins}</td><td>{summary.wins ? ((prize.wins/summary.wins)*100).toFixed(1) : "0.0"}%</td><td>{prize.coupons}</td><td>{prize.redeemed}</td></tr>)}</tbody></table></div>}</div>
    </>}
    <div className="admin-panel"><h2 style={{marginTop:0}}>Customer & Play History</h2><p style={{color:"#6b7280"}}>Detailed campaign activity including customer details, results, prizes and coupons.</p>{loading?<p>Loading campaign report...</p>:filteredRows.length===0?<p className="empty">No records match the selected filters.</p>:!selectedColumns.length?<p className="empty">Select at least one table column.</p>:<div style={{overflowX:"auto"}}><table><thead><tr>{selectedColumns.map((field)=><th key={field.key}>{field.label}</th>)}</tr></thead><tbody>{filteredRows.map((row)=><tr key={row.session_id}>{selectedColumns.map((field)=><td key={field.key}>{value(row,field.key)||"—"}</td>)}</tr>)}</tbody></table></div>}</div>
    {showColumns && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10000,padding:"20px"}} onClick={()=>setShowColumns(false)}><div style={{background:"#fff",borderRadius:"16px",padding:"24px",width:"100%",maxWidth:"520px"}} onClick={(e)=>e.stopPropagation()}><h2>Table Columns</h2><div style={{display:"flex",gap:"8px",marginBottom:"14px"}}><button style={button} onClick={()=>setTableFields(fields.map(f=>f.key))}>Select All</button><button style={button} onClick={()=>setTableFields(defaultFields)}>Default</button><button style={button} onClick={()=>setTableFields([])}>Clear</button></div><div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"10px"}}>{fields.map((field)=><label key={field.key} style={{padding:"9px",border:"1px solid #e5e7eb",borderRadius:"9px"}}><input type="checkbox" checked={tableFields.includes(field.key)} onChange={()=>toggle(field.key,tableFields,setTableFields)}/> {field.label}</label>)}</div><div style={{textAlign:"right",marginTop:"18px"}}><button style={{...button,background:"#111827",color:"#fff"}} onClick={()=>setShowColumns(false)}>Done</button></div></div></div>}
    {showExport && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10000,padding:"20px"}} onClick={()=>setShowExport(false)}><div style={{background:"#fff",borderRadius:"16px",padding:"24px",width:"100%",maxWidth:"520px"}} onClick={(e)=>e.stopPropagation()}><h2>Export Campaign Report</h2><p style={{color:"#6b7280"}}>Choose the fields to include. Current filters will be applied.</p><div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"10px"}}>{fields.map((field)=><label key={field.key} style={{padding:"9px",border:"1px solid #e5e7eb",borderRadius:"9px"}}><input type="checkbox" checked={exportFields.includes(field.key)} onChange={()=>toggle(field.key,exportFields,setExportFields)}/> {field.label}</label>)}</div><div style={{display:"flex",justifyContent:"flex-end",gap:"8px",marginTop:"18px"}}><button style={button} onClick={()=>setShowExport(false)}>Cancel</button><button style={{...button,background:"#111827",color:"#fff",opacity:exportFields.length?1:.5}} disabled={!exportFields.length} onClick={exportCsv}>Export {filteredRows.length} Records</button></div></div></div>}
  </div>;
}
