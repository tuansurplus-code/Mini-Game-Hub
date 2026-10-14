"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
};

export default function AdminModal({ open, title, onClose, children, maxWidth = 640 }: Props) {
  const panel = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(panel.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled),a[href],input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])'
    ) ?? []).filter(element => element.getClientRects().length > 0);
    (panel.current?.querySelector<HTMLElement>('input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled)') ?? panel.current)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close.current(); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0], last = items[items.length - 1];
      if (!first) { event.preventDefault(); panel.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !items.includes(document.activeElement as HTMLElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !items.includes(document.activeElement as HTMLElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);
  if (!open) return null;
  return <div className="admin-modal-backdrop" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section ref={panel} tabIndex={-1} className="admin-modal" style={{ maxWidth }} role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
      <header className="admin-modal-header">
        <h2 id="admin-modal-title">{title}</h2>
        <button type="button" className="admin-modal-close" aria-label="Close dialog" onClick={onClose}>×</button>
      </header>
      <div className="admin-modal-body">{children}</div>
    </section>
  </div>;
}
