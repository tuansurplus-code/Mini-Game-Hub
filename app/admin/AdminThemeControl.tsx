"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
const STORAGE_KEY = "mini-game-hub-admin-theme";

export default function AdminThemeControl({ storageKey = STORAGE_KEY, label = "Admin color theme" }: { storageKey?: string; label?: string }) {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      const nextTheme: Theme = saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
      setTheme(nextTheme);
      document.querySelector(".admin-shell")?.setAttribute("data-theme", nextTheme);
    } catch {
      document.querySelector(".admin-shell")?.setAttribute("data-theme", "system");
    }
  }, []);

  function changeTheme(value: string) {
    if (value !== "light" && value !== "dark" && value !== "system") return;
    setTheme(value);
    document.querySelector(".admin-shell")?.setAttribute("data-theme", value);
    try {
      window.localStorage.setItem(storageKey, value);
    } catch {
      // Theme still applies for this page view when storage is unavailable.
    }
  }

  return (
    <label className="admin-theme-control">
      <span>Theme</span>
      <select
        className="admin-theme-select"
        aria-label={label}
        value={theme}
        onChange={event => changeTheme(event.target.value)}
      >
        <option value="light">White</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </label>
  );
}
