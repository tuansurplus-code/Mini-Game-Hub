import type { ReactNode } from "react";

export type AdminIconName =
  | "overview" | "campaign" | "game" | "prize" | "coupon" | "winner" | "reports"
  | "team" | "billing" | "account" | "website" | "content" | "contact"
  | "membership" | "staff" | "template" | "plans" | "subscription" | "usage"
  | "plus" | "bell" | "close";

const paths: Record<AdminIconName, ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>,
  campaign: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" /></>,
  game: <><path d="M6 12h4M8 10v4M15 13h.01M18 11h.01" /><path d="M7 6h10a5 5 0 0 1 4.7 6.7l-1.3 3.7a2.5 2.5 0 0 1-4.1 1l-1.7-1.5H9.4l-1.7 1.5a2.5 2.5 0 0 1-4.1-1l-1.3-3.7A5 5 0 0 1 7 6Z" /></>,
  prize: <><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0Z" /><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4" /></>,
  coupon: <><path d="M4 7a2 2 0 0 0 0 4v2a2 2 0 0 0 0 4h16a2 2 0 0 0 0-4v-2a2 2 0 0 0 0-4Z" /><path d="M13 7v2M13 13v2M13 19v1" /></>,
  winner: <><path d="M7 4h10v4a5 5 0 0 1-10 0ZM8 21h8M12 13v8M5 5H3v2a4 4 0 0 0 4 4M19 5h2v2a4 4 0 0 1-4 4" /></>,
  reports: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
  team: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1" /></>,
  billing: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  account: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  website: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v5" /></>,
  content: <><path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M8 12h8M8 16h8" /></>,
  contact: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  membership: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M17 8h4M19 6v4" /></>,
  staff: <><path d="M12 3 20 6v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6Z" /><path d="m9 12 2 2 4-4" /></>,
  template: <><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="5" rx="1" /><rect x="13" y="10" width="8" height="11" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /></>,
  plans: <><path d="M4 7h16M4 12h16M4 17h10" /><circle cx="19" cy="17" r="2" /></>,
  subscription: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.5-3" /></>,
  usage: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
};

export function AdminIcon({ name, size = 18 }: { name: AdminIconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function AdminIconButton({ label, name, onClick, className = "", disabled = false, expanded, badge, badgeTone }: {
  label: string;
  name: AdminIconName;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  expanded?: boolean;
  badge?: ReactNode;
  badgeTone?: "danger" | "warning";
}) {
  return <button type="button" className={`admin-icon-button ${className}`.trim()} title={label} aria-label={label} aria-expanded={expanded} onClick={onClick} disabled={disabled}>
    <AdminIcon name={name} />{badge != null && <span className={`admin-icon-button__badge${badgeTone === "danger" ? " is-danger" : ""}`}>{badge}</span>}
  </button>;
}
