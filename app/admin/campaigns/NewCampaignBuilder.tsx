"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BuilderGameType, gameLabels, gameTypes } from "../../../lib/game-builder";

type Game = { id: string; type: string; status: string };
const field = { width: "100%", padding: 12, border: "1px solid #d1d5db", borderRadius: 8, margin: "8px 0 18px", boxSizing: "border-box" as const };
async function api(path: string, body?: Record<string, unknown>) {
  const response = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to continue. Please try again.");
  return result;
}

export default function NewCampaignBuilder({ initialGame }: { initialGame: BuilderGameType | null }) {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "game">("details");
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [mode, setMode] = useState("automatic");
  const [game, setGame] = useState<BuilderGameType | null>(initialGame);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const createdGame = useRef<string | null>(null);
  const submitting = useRef(false);

  function detailsValid() {
    if (!name.trim()) { setError("Enter a campaign name."); return false; }
    if (start && end && new Date(end) <= new Date(start)) { setError("End date must be after the start date."); return false; }
    return true;
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!detailsValid()) return;
    if (step === "details") { setStep("game"); return; }
    if (!game) { setError("Choose a game to continue."); return; }
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      // Retain successful IDs so retrying never creates a second campaign or game.
      let campaignId = draftId;
      if (!campaignId) {
        const utc = (value: string) => value ? new Date(`${value}:00+05:30`).toISOString() : null;
        const result = await api("/api/admin/campaigns", { name: name.trim(), starts_at: utc(start), ends_at: utc(end), scheduling_mode: mode });
        campaignId = result.campaign.id as string;
        setDraftId(campaignId);
      }
      let gameId = createdGame.current;
      if (!gameId) {
        const catalog = await api("/api/admin/campaign-games");
        const existing = (catalog.games as Game[]).find(item => item.type === game && item.status !== "archived");
        if (existing) gameId = existing.id;
        else {
          const result = await api("/api/admin/games", { name: `${gameLabels[game]} - ${name.trim()}`, type: game });
          gameId = result.game.id as string;
        }
        createdGame.current = gameId;
      }
      // A previous request may have succeeded even if its response was lost.
      const draft = await api(`/api/admin/campaigns/${campaignId}`);
      let assignment = draft.campaignGames?.find((item: { game_id: string }) => item.game_id === gameId);
      if (!assignment) assignment = (await api("/api/admin/campaign-games", { campaign_id: campaignId, game_id: gameId })).campaignGame;
      router.push(`/admin/campaign-games/${assignment.id}?step=appearance`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create campaign.");
    } finally { setBusy(false); submitting.current = false; }
  }

  return <div style={{ maxWidth: 760, margin: "0 auto" }}>
    <div className="admin-header"><div><div className="eyebrow">GAME BUILDER</div><h1>Create Campaign</h1><p>Choose a game, configure your rewards and publish your customer campaign.</p></div></div>
    <nav aria-label="Campaign creation steps" style={{ display: "flex", gap: 12, marginBottom: 20 }}>
      <b aria-current={step === "details" ? "step" : undefined}>1. Campaign Details</b><span>→</span><b aria-current={step === "game" ? "step" : undefined}>2. Choose Game</b>
    </nav>
    <section className="admin-panel">
      {initialGame && <p style={{ color: "#475569" }}>Selected from the homepage: <strong>{gameLabels[initialGame]}</strong></p>}
      {error && <div role="alert" className="error-box" style={{ marginBottom: 16 }}>{error}</div>}
      {draftId && <p>Your draft is saved. Retry to finish game assignment, or <Link href={`/admin/campaigns/${draftId}`}>open the saved draft</Link>.</p>}
      <form onSubmit={submit}>
        {step === "details" ? <>
          <label htmlFor="builder-name">Campaign name</label><input id="builder-name" required value={name} onChange={event => setName(event.target.value)} style={field} placeholder="Example: Weekend Rewards" />
          <label htmlFor="builder-mode">Scheduling</label><select id="builder-mode" value={mode} onChange={event => setMode(event.target.value)} style={field}><option value="automatic">Automatic</option><option value="manual">Manual</option></select>
          <label htmlFor="builder-start">Start date and time (Sri Lanka)</label><input id="builder-start" type="datetime-local" value={start} onChange={event => setStart(event.target.value)} style={field} />
          <label htmlFor="builder-end">End date and time (Sri Lanka)</label><input id="builder-end" type="datetime-local" value={end} onChange={event => setEnd(event.target.value)} style={field} />
        </> : <fieldset disabled={busy || Boolean(draftId)} style={{ border: 0, padding: 0, margin: "0 0 24px" }}>
          <legend style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Choose your game</legend>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
            {gameTypes.map(type => <label key={type} style={{ padding: 24, border: `2px solid ${game === type ? "#111827" : "#e5e7eb"}`, borderRadius: 12, cursor: "pointer", background: game === type ? "#f1f5f9" : "#fff" }}>
              <input type="radio" name="builder-game" value={type} checked={game === type} onChange={() => setGame(type)} /> <strong>{gameLabels[type]}</strong>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 0 }}>Customize the game, prizes, rules and coupons.</p>
            </label>)}
          </div>
        </fieldset>}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          {step === "game" && !draftId ? <button type="button" className="secondary-btn" disabled={busy} onClick={() => setStep("details")}>Back</button> : <Link href="/admin/campaigns" className="secondary-btn">Campaigns</Link>}
          <button type="submit" className="primary-btn" disabled={busy}>{busy ? "Preparing your game..." : step === "details" ? "Continue to Choose Game" : draftId ? "Retry Game Assignment" : "Create & Configure Game"}</button>
        </div>
      </form>
    </section>
  </div>;
}
