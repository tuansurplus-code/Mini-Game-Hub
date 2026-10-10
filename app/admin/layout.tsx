import Link from "next/link";
import "./admin.css";
import SignOutButton from "./SignOutButton";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import AdminNavigation from "./AdminNavigation";
import { requireAdmin } from "../../lib/admin-auth";
import { createSupabaseServerClient } from "../../lib/supabase-server";

const links = [
  { label: "Overview", href: "/admin" },
  { label: "Campaigns", href: "/admin/campaigns" },
  { label: "Games", href: "/admin/games" },
  { label: "Prizes", href: "/admin/prizes" },
  { label: "Coupons", href: "/admin/coupons" },
  { label: "Winner History", href: "/admin/winners" },
  { label: "Reports", href: "/admin/reports" },
  { label: "Team", href: "/admin/team" },
  { label: "Billing", href: "/admin/billing" },
  { label: "Account", href: "/admin/settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, workspaceId, role } = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id,role,workspaces!inner(id,name,status)")
    .eq("user_id", user.id);
  const workspaces = (memberships ?? []).flatMap((item: any) => {
    const workspace = Array.isArray(item.workspaces) ? item.workspaces[0] : item.workspaces;
    return workspace?.status === "active" && ["owner", "admin", "editor", "viewer"].includes(item.role)
      ? [{ id: item.workspace_id, name: workspace.name }]
      : [];
  });
  const currentWorkspace = workspaces.find(item => item.id === workspaceId);

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-brand">Mini-Game Hub</div>
      <div className="admin-label">CUSTOMER ADMIN</div>
      {workspaces.length > 1
        ? <WorkspaceSwitcher workspaces={workspaces} currentId={workspaceId} />
        : <div style={{ fontSize: 13, fontWeight: 700, padding: "4px 2px 12px" }}>{currentWorkspace?.name ?? "Workspace"}</div>}
      <AdminNavigation links={links} />
      <div className="admin-sidebar-footer">
        <div style={{ fontSize: 11, color: "#9ca3af", padding: "0 4px" }}>{user.email}<br />{role.toUpperCase()}</div>
        <Link className="admin-customer" href="/">← Public Site</Link>
        <SignOutButton />
      </div>
    </aside>
    <main className="admin-main">{children}</main>
  </div>;
}
