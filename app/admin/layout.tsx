import Link from "next/link";
import "./admin.css";
import SignOutButton from "./SignOutButton";

const links = [
  { label: "Overview", href: "/admin" },
  { label: "Games", href: "/admin/games" },
  { label: "Campaigns", href: "/admin/campaigns" },
  { label: "Prizes", href: "/admin/prizes" },
  { label: "Coupons", href: "/admin/coupons" },
  { label: "Winner History", href: "/admin/winners" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">Mini-Game Hub</div>
        <div className="admin-label">ADMIN</div>
        <nav className="admin-nav">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>{link.label}</Link>
          ))}
        </nav>
        <div style={{ marginTop: "auto", display: "grid", gap: 10 }}>
          <Link className="admin-customer" href="/">← Customer View</Link>
          <SignOutButton />
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
