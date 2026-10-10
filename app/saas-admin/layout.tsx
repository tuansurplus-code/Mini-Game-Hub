import Link from "next/link";
import { platformRoleLabels } from "../../lib/platform-roles";
import "../admin/admin.css";
import SignOutButton from "../admin/SignOutButton";
import AdminNavigation from "../admin/AdminNavigation";
import AdminThemeControl from "../admin/AdminThemeControl";
import { requirePlatformAdmin } from "../../lib/platform-auth";

const links = [
  { label: "Overview", href: "/saas-admin" },
  { section: "CUSTOMER OPERATIONS" },
  { label: "Accounts", href: "/saas-admin/accounts" },
  { label: "Workspace Memberships", href: "/saas-admin/memberships" },
  { section: "SAAS CONFIGURATION" },
  { label: "Platform Staff", href: "/saas-admin/users" },
  { label: "Game Templates", href: "/saas-admin/templates" },
  { label: "Plans & Limits", href: "/saas-admin/plans" },
  { label: "Subscription Requests", href: "/saas-admin/subscriptions" },
  { label: "Usage", href: "/saas-admin/usage" },
  { label: "Platform Settings", href: "/saas-admin/settings" },
];

export default async function SaaSAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await requirePlatformAdmin();
  return <div className="admin-shell" data-theme="system">
    <aside className="admin-sidebar">
      <div className="admin-brand">Mini-Game Hub</div>
      <div className="admin-label">SAAS CONTROL</div>
      <AdminNavigation links={links} />
      <div className="admin-sidebar-footer">
        <div className="admin-user-meta">{user.email}<br /><b>{platformRoleLabels[role]}</b></div>
        <AdminThemeControl storageKey="mini-game-hub-saas-theme" label="SaaS Admin color theme" />
        <Link className="admin-customer" href="/">← Public Site</Link>
        <SignOutButton area="platform" />
      </div>
    </aside>
    <main className="admin-main">{children}</main>
  </div>;
}
