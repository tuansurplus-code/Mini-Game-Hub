"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { platformSupabase } from "../../lib/supabase-platform";

export default function PlatformLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const { data, error: loginError } = await platformSupabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
      const { data: admin, error: accessError } = await platformSupabase.from("platform_admins")
        .select("role,active").eq("user_id", data.user.id).maybeSingle();
      if (accessError || !admin?.active || !["owner", "admin", "support"].includes(admin.role)) {
        await platformSupabase.auth.signOut({ scope: "local" });
        throw new Error("This account does not have platform administrator access.");
      }
      window.location.assign("/saas-admin");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in. Please try again.");
      setBusy(false);
    }
  }

  const input = { width: "100%", padding: 12, marginTop: 8, marginBottom: 20, border: "1px solid #cbd5e1", borderRadius: 8, boxSizing: "border-box" as const, fontSize: 16, background: "white", color: "#111827" };
  return <main style={{ minHeight: "100vh", background: "#0f172a", display: "grid", placeItems: "center", padding: 24 }}>
    <section style={{ width: "100%", maxWidth: 430, background: "white", color: "#111827", borderRadius: 18, padding: 32 }}>
      <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".12em", color: "#475569" }}>MINI-GAME HUB · PLATFORM</p>
      <h1 style={{ fontSize: 28 }}>SaaS Admin Sign In</h1>
      <p style={{ color: "#64748b", lineHeight: 1.6 }}>Sign in to manage the platform. Customer workspaces use a separate login.</p>
      {error && <p role="alert" style={{ color: "#b91c1c", background: "#fef2f2", padding: 12, borderRadius: 8 }}>{error}</p>}
      <form onSubmit={submit}>
        <label htmlFor="platform-email">Email</label>
        <input id="platform-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} style={input} />
        <label htmlFor="platform-password">Password</label>
        <input id="platform-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} style={input} />
        <button disabled={busy} style={{ width: "100%", padding: 13, border: 0, borderRadius: 8, background: "#111827", color: "white", fontSize: 16, cursor: "pointer" }}>{busy ? "Signing in…" : "Sign In to SaaS Admin"}</button>
      </form>
      <p style={{ marginTop: 24, fontSize: 14 }}><Link href="/">← Back to Mini-Game Hub</Link></p>
    </section>
  </main>;
}
