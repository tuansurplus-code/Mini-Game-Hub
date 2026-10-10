"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { platformSupabase } from "../../lib/supabase-platform";

export default function SignOutButton({ area = "customer" }: { area?: "customer" | "platform" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    const client = area === "platform" ? platformSupabase : supabase;
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) { setLoading(false); window.alert("Unable to sign out. Please try again."); return; }
    router.replace(area === "platform" ? "/saas-login" : "/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      className="admin-signout-button"
      onClick={signOut}
      disabled={loading}
      style={{
        width: "100%",
        border: "1px solid rgba(255,255,255,.18)",
        borderRadius: 8,
        padding: "10px 12px",
        background: "transparent",
        color: "inherit",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.65 : 1,
        textAlign: "left",
      }}
    >
      {loading ? "Signing out..." : "Sign Out"}
    </button>
  );
}
