"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavLink = { label: string; href: string } | { section: string };

export default function AdminNavigation({ links }: { links: NavLink[] }) {
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
      <span aria-hidden="true">{open ? "×" : "☰"}</span>
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
        >{item.label}</Link>;
      })}
    </nav>
  </div>;
}
