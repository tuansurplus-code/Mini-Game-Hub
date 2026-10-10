import Link from "next/link";
import "../admin/admin.css";
import SignOutButton from "../admin/SignOutButton";
import { requirePlatformAdmin } from "../../lib/platform-auth";

const links = [
  { label: "Overview", href: "/saas-admin" },
  { label: "Accounts", href: "/saas-admin/accounts" },
  { label: "Users", href: "/saas-admin/users" },
  { label: "Game Templates", href: "/saas-admin/templates" },
  { label: "Plans & Limits", href: "/saas-admin/plans" },
  { label: "Subscription Requests", href: "/saas-admin/subscriptions" },
  { label: "Usage", href: "/saas-admin/usage" },
  { label: "Platform Settings", href: "/saas-admin/settings" },
];

export default async function SaaSAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await requirePlatformAdmin();
  return <div className="admin-shell"><aside className="admin-sidebar"><div className="admin-brand">Mini-Game Hub</div><div className="admin-label">SAAS CONTROL</div><nav className="admin-nav">{links.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav><div style={{ marginTop: "auto", display: "grid", gap: 10 }}><div style={{ fontSize: 12, color: "#9ca3af", padding: "0 4px" }}>{user.email}<br /><b>{role.toUpperCase()}</b></div><Link className="admin-customer" href="/">← Public Site</Link><SignOutButton area="platform" /></div></aside><main className="admin-main">{children}</main></div>;
}
