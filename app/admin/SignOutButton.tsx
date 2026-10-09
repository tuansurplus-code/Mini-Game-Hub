"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
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
