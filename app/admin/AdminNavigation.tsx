"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AdminIcon, type AdminIconName } from "./AdminIcon";

type NavLink = { label: string; href: string; icon?: AdminIconName } | { section: string };

export default function AdminNavigation({ links }: { links: readonly NavLink[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return <div className="admin-navigation">
    <button
      type="button"
      className="admin-menu-toggle"
      aria-expanded={open}
      aria-controls="admin-navigation-links"
      onClick={() => setOpen(value => !value)}
    >
      <span>{open ? "Close menu" : "Menu"}</span>
      <span aria-hidden="true"><AdminIcon name={open ? "close" : "overview"} size={18} /></span>
    </button>
    <nav id="admin-navigation-links" className={`admin-nav ${open ? "is-open" : ""}`} aria-label="Admin navigation">
      {links.map(item => {
        if ("section" in item) return <div key={item.section} className="admin-nav-section">{item.section}</div>;
        const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
        return <Link
          key={item.href}
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={active ? "is-active" : undefined}
          onClick={() => setOpen(false)}
        ><>{item.icon && <AdminIcon name={item.icon} size={17} />}<span>{item.label}</span></></Link>;
      })}
    </nav>
  </div>;
}
