"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

function InviteContent() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const token = search.get("token") || "";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const inviteQuery = `invite=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
  const loginHref = `/login?${inviteQuery}`;
  const signupHref = `/signup?${inviteQuery}`;

  async function acceptInvite() {
    setAccepting(true);
    setError("");
    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, token }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to accept this invitation.");
      setAccepted(true);
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to accept this invitation.");
    } finally { setAccepting(false); }
  }

  useEffect(() => {
    let active = true;
    async function checkSession() {
      if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
        if (active) { setError("This invitation link is invalid or incomplete."); setLoading(false); }
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setEmail(data.user?.email || "");
      setLoading(false);
      if (data.user) void acceptInvite();
    }
    void checkSession();
    return () => { active = false; };
  }, [id, token]);

  async function switchAccount() {
    await supabase.auth.signOut();
    router.push(loginHref);
  }

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f6f7f9", padding: 20 }}>
    <section style={{ width: "100%", maxWidth: 480, background: "white", border: "1px solid #e5e7eb", borderRadius: 16, padding: 32 }}>
      <p style={{ fontSize: 11, letterSpacing: ".12em", fontWeight: 800, color: "#7b8492" }}>MINI-GAME HUB</p>
      <h1 style={{ marginBottom: 8 }}>Join a workspace</h1>
      {loading || accepting ? <p>{accepting ? "Accepting your invitation…" : "Checking invitation…"}</p> : accepted ? <p>Invitation accepted. Opening your workspace…</p> :
        error ? <div role="alert" style={{ color: "#991b1b", background: "#fef2f2", padding: 14, borderRadius: 9, margin: "16px 0" }}>{error}</div> : null}
      {!loading && !accepted && <div>
        {email ? <>
          <p>Signed in as <strong>{email}</strong>. This invitation can only be accepted by the email address it was sent to.</p>
          {!accepting && <button type="button" onClick={() => void acceptInvite()} className="primary-btn">Accept invitation</button>}
          <p><button type="button" onClick={() => void switchAccount()} style={{ border: 0, background: "none", color: "#374151", textDecoration: "underline", padding: 0, cursor: "pointer" }}>Switch account</button></p>
        </> : <>
          <p>This invitation is tied to the email address it was sent to. Sign in with that account, or create an account using the same email.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="primary-btn" href={loginHref}>Sign in to accept</Link>
            <Link href={signupHref} style={{ display: "inline-block", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8 }}>Create account</Link>
          </div>
        </>}
      </div>}
      {!loading && error && !email && <p><Link href={loginHref}>Sign in with the invited email</Link></p>}
    </section>
  </main>;
}

export default function InvitePage() {
  return <Suspense fallback={<main style={{ padding: 40 }}>Loading invitation…</main>}><InviteContent /></Suspense>;
}
