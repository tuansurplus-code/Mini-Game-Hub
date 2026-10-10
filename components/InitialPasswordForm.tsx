"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function InitialPasswordForm({ area = "customer" }: { area?: "customer" | "platform" }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setWorking(true);
    try {
      const response = await fetch("/api/account/initial-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, area }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update your password.");
      setMessage("Password updated. Opening your dashboard…");
      window.setTimeout(() => router.replace(area === "platform" ? "/saas-admin" : "/admin"), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update your password.");
    } finally {
      setWorking(false);
    }
  }

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f7f8fa" }}>
    <section style={{ width: "100%", maxWidth: 440, background: "white", border: "1px solid #e5e7eb", borderRadius: 16, padding: 28, boxShadow: "0 12px 35px rgba(15,23,42,.08)" }}>
      <p style={{ color: "#6b7280", fontSize: 12, fontWeight: 800, letterSpacing: ".08em", margin: "0 0 8px" }}>MINI-GAME HUB</p>
      <h1 style={{ margin: "0 0 10px" }}>Set your password</h1>
      <p style={{ color: "#5b6472", lineHeight: 1.6, marginTop: 0 }}>Your administrator created your account. Set a new password to continue.</p>
      {error && <div role="alert" style={{ padding: 12, margin: "16px 0", color: "#991b1b", background: "#fef2f2", borderRadius: 8 }}>{error}</div>}
      {message && <div role="status" style={{ padding: 12, margin: "16px 0", color: "#065f46", background: "#ecfdf5", borderRadius: 8 }}>{message}</div>}
      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>New password
          <input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: 8, boxSizing: "border-box" }} />
        </label>
        <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>Confirm new password
          <input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: 8, boxSizing: "border-box" }} />
        </label>
        <button className="primary-btn" disabled={working}>{working ? "Updating…" : "Set password and continue"}</button>
      </form>
    </section>
  </main>;
}
