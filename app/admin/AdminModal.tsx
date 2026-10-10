"use client";

import type { ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
};

export default function AdminModal({ open, title, onClose, children, maxWidth = 640 }: Props) {
  if (!open) return null;
  return <div className="admin-modal-backdrop" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className="admin-modal" style={{ maxWidth }} role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
      <header className="admin-modal-header">
        <h2 id="admin-modal-title">{title}</h2>
        <button type="button" className="admin-modal-close" aria-label="Close dialog" onClick={onClose}>×</button>
      </header>
      <div className="admin-modal-body">{children}</div>
    </section>
  </div>;
}
