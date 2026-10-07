"use client";

import { PointerEvent, useRef, useState } from "react";

type ScratchResult = {
  session_id?: string;
  winner_id?: string | null;
  prize_id?: string;
  prize_name?: string;
  prize_description?: string | null;
  prize_image_url?: string | null;
  coupon_code?: string | null;
  replayed?: boolean;
  is_win?: boolean;
};

type Props = {
  slug: string;
  gameName: string;
};

type RestrictionPopup = { title: string; message: string };

function normalizeMobile(mobile: string) {
  const cleaned = mobile.trim().replace(/\s+/g, "");
  if (/^07\d{8}$/.test(cleaned)) return `+94${cleaned.slice(1)}`;
  if (/^947\d{8}$/.test(cleaned)) return `+${cleaned}`;
  if (/^\+947\d{8}$/.test(cleaned)) return cleaned;
  return null;
}

export default function ScratchAndWinGame({ slug, gameName }: Props) {
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScratchResult | null>(null);
  const [error, setError] = useState("");
  const [restrictionPopup, setRestrictionPopup] = useState<RestrictionPopup | null>(null);
  const [scratched, setScratched] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const dragging = useRef(false);

  async function startGame() {
    setError("");
    setRestrictionPopup(null);
    setResult(null);
    setScratched(new Set());
    setRevealed(false);

    if (!normalizeMobile(mobile)) {
      setError("Please enter a valid Sri Lankan mobile number.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/play/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.error_title) {
          setRestrictionPopup({
            title: data.error_title,
            message: data.error || "Unable to play the game.",
          });
        } else {
          setError(data.error || "Unable to play the game.");
        }
        return;
      }
      setResult(data.result as ScratchResult);
    } catch {
      setError("Unable to connect to the game. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function scratchAt(event: PointerEvent<HTMLDivElement>) {
    if (!result || revealed) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width - 1, event.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height - 1, event.clientY - rect.top));
    const cols = 10;
    const rows = 6;
    const col = Math.floor((x / rect.width) * cols);
    const row = Math.floor((y / rect.height) * rows);
    const next = new Set(scratched);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const c = col + dx;
        const r = row + dy;
        if (c >= 0 && c < cols && r >= 0 && r < rows) next.add(r * cols + c);
      }
    }
    setScratched(next);
    if (next.size >= 30) setRevealed(true);
  }

  const isWin = result?.is_win !== false;
  const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    padding: "13px 14px",
    fontSize: "16px",
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", padding: "32px 16px 48px" }}>
      <div style={{ width: "100%", maxWidth: "680px", margin: "0 auto" }}>
        <section style={{ background: "#fff", borderRadius: "24px", padding: "34px 22px 38px", boxShadow: "0 12px 40px rgba(0,0,0,.10)", textAlign: "center" }}>
          <div style={{ fontSize: "34px", fontWeight: 900, color: "#111827", marginBottom: "8px" }}>SCRATCH & WIN</div>
          <div style={{ color: "#6b7280", fontSize: "16px", marginBottom: "6px" }}>Scratch the card to reveal your result!</div>
          <div style={{ color: "#374151", fontWeight: 700, fontSize: "14px", marginBottom: "26px" }}>{gameName}</div>

          {!result ? (
            <div style={{ maxWidth: "420px", margin: "0 auto" }}>
              <label htmlFor="scratch-mobile" style={{ display: "block", textAlign: "left", fontSize: "14px", fontWeight: 700, marginBottom: "7px" }}>Mobile Number</label>
              <input id="scratch-mobile" type="tel" placeholder="07XXXXXXXX" value={mobile} onChange={(e) => setMobile(e.target.value)} disabled={loading} style={inputStyle} />
              {error && <div style={{ color: "#b91c1c", background: "#fef2f2", padding: "11px", borderRadius: "10px", marginTop: "12px", textAlign: "left" }}>{error}</div>}
              <button type="button" onClick={startGame} disabled={loading || !mobile.trim()} style={{ width: "100%", marginTop: "14px", border: "none", borderRadius: "12px", padding: "15px", fontSize: "17px", fontWeight: 900, background: "#e31b23", color: "#fff", cursor: "pointer", opacity: loading || !mobile.trim() ? .55 : 1 }}>
                {loading ? "PREPARING..." : "START SCRATCHING"}
              </button>
            </div>
          ) : (
            <>
              <div
                onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); scratchAt(e); }}
                onPointerMove={(e) => { if (dragging.current) scratchAt(e); }}
                onPointerUp={() => { dragging.current = false; }}
                onPointerCancel={() => { dragging.current = false; }}
                style={{ position: "relative", width: "min(88vw, 480px)", height: "280px", margin: "0 auto", borderRadius: "22px", overflow: "hidden", border: "5px solid #111827", userSelect: "none", touchAction: "none", background: "#fff7ed", cursor: revealed ? "default" : "crosshair" }}
              >
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", background: isWin ? "linear-gradient(135deg,#fff7ed,#fef3c7)" : "#f9fafb" }}>
                  <div style={{ fontSize: "42px", marginBottom: "8px" }}>{isWin ? "🎉" : "↻"}</div>
                  <div style={{ fontSize: "13px", fontWeight: 900, color: "#6b7280", letterSpacing: ".08em", marginBottom: "7px" }}>{isWin ? "CONGRATULATIONS!" : "TRY AGAIN"}</div>
                  <div style={{ fontSize: "30px", fontWeight: 900, color: "#111827" }}>{result.prize_name || (isWin ? "YOU WON!" : "Better luck next time")}</div>
                  {result.prize_description && <div style={{ color: "#6b7280", marginTop: "8px" }}>{result.prize_description}</div>}
                </div>

                {!revealed && Array.from({ length: 60 }, (_, i) => !scratched.has(i) && (
                  <div key={i} style={{ position: "absolute", left: `${(i % 10) * 10}%`, top: `${Math.floor(i / 10) * (100 / 6)}%`, width: "10.5%", height: `${100 / 6 + .5}%`, background: i % 2 ? "#9ca3af" : "#6b7280", border: "1px solid rgba(255,255,255,.12)", boxSizing: "border-box", pointerEvents: "none" }} />
                ))}
                {!revealed && scratched.size < 5 && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", color: "#fff", fontWeight: 900, fontSize: "22px", textShadow: "0 2px 4px rgba(0,0,0,.4)" }}>SCRATCH HERE</div>}
              </div>

              <div style={{ marginTop: "14px", color: "#6b7280", fontSize: "14px" }}>{revealed ? "Your result has been revealed." : `Scratch the silver area to reveal your result (${Math.min(100, Math.round(scratched.size / 30 * 100))}%)`}</div>
              {revealed && result.replayed && <div style={{ marginTop: "10px", fontWeight: 700, color: "#6b7280" }}>This is your previous result.</div>}
              {revealed && isWin && result.coupon_code && <div style={{ margin: "18px auto 0", maxWidth: "360px", padding: "15px", borderRadius: "14px", background: "#f0fdf4", border: "1px solid #bbf7d0" }}><div style={{ fontSize: "12px", fontWeight: 800, color: "#166534" }}>COUPON CODE</div><div style={{ fontSize: "24px", fontWeight: 900, letterSpacing: ".06em", marginTop: "4px" }}>{result.coupon_code}</div></div>}
            </>
          )}
        </section>
      </div>

      {restrictionPopup && <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(17,24,39,.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}><div style={{ position: "relative", width: "100%", maxWidth: "420px", background: "#fff", borderRadius: "24px", padding: "36px 24px 28px", textAlign: "center" }}><button onClick={() => setRestrictionPopup(null)} style={{ position: "absolute", top: 14, right: 14, border: "none", background: "transparent", fontSize: 22, cursor: "pointer" }}>×</button><div style={{ fontSize: "24px", fontWeight: 900, marginBottom: "12px" }}>{restrictionPopup.title}</div><div style={{ color: "#6b7280", marginBottom: "22px", lineHeight: 1.5 }}>{restrictionPopup.message}</div><button onClick={() => setRestrictionPopup(null)} style={{ width: "100%", border: "none", borderRadius: "12px", padding: "13px", background: "#e31b23", color: "#fff", fontWeight: 800 }}>OK</button></div></div>}
    </main>
  );
}
