"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Workspace = { id: string; name: string };
export default function WorkspaceSwitcher({ workspaces, currentId }: { workspaces: Workspace[]; currentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function changeWorkspace(workspaceId: string) {
    if (!workspaceId || workspaceId === currentId) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to switch workspace.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to switch workspace.");
    } finally { setLoading(false); }
  }

  return <div style={{ padding: "0 2px 14px" }}>
    <label htmlFor="workspace-switcher" style={{ display: "block", fontSize: 10, color: "#9ca3af", marginBottom: 5 }}>WORKSPACE</label>
    <select id="workspace-switcher" value={currentId} disabled={loading} onChange={event => void changeWorkspace(event.target.value)}
      style={{ width: "100%", padding: "8px 7px", border: "1px solid #374151", borderRadius: 7, background: "#111827", color: "white" }}>
      {workspaces.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
    </select>
    {loading && <span role="status" style={{ display: "block", color: "#9ca3af", fontSize: 11, marginTop: 5 }}>Switching…</span>}
    {error && <span role="alert" style={{ display: "block", color: "#fca5a5", fontSize: 11, marginTop: 5 }}>{error}</span>}
  </div>;
}
