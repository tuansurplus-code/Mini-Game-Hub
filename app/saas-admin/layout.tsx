import Link from "next/link";
import { platformRoleLabels } from "../../lib/platform-roles";
import "../admin/admin.css";
import SignOutButton from "../admin/SignOutButton";
import AdminNavigation from "../admin/AdminNavigation";
import AdminThemeControl from "../admin/AdminThemeControl";
import { requirePlatformAdmin } from "../../lib/platform-auth";

const links = [
  { label: "Overview", icon: "overview", href: "/saas-admin" },
  { section: "PUBLIC WEBSITE" },
  { label: "Homepage Layout", icon: "website", href: "/saas-admin/settings" },
  { label: "Content Pages", icon: "content", href: "/saas-admin/content-pages" },
  { label: "Contact Submissions", icon: "contact", href: "/saas-admin/contact-submissions" },
  { section: "CUSTOMER OPERATIONS" },
  { label: "Accounts", icon: "team", href: "/saas-admin/accounts" },
  { label: "Workspace Memberships", icon: "membership", href: "/saas-admin/memberships" },
  { section: "SAAS CONFIGURATION" },
  { label: "Platform Staff", icon: "staff", href: "/saas-admin/users" },
  { label: "Game Templates", icon: "template", href: "/saas-admin/templates" },
  { label: "Plans & Limits", icon: "plans", href: "/saas-admin/plans" },
  { label: "Subscription Requests", icon: "subscription", href: "/saas-admin/subscriptions" },
  { label: "Usage", icon: "usage", href: "/saas-admin/usage" },
] as const;

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
