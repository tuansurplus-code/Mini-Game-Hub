"use client";

import { useEffect, useState } from "react";

type ContactSubmission = { id: string; name: string | null; phone_number: string | null; email: string | null; responses: { label: string; value: string }[]; created_at: string };

export default function ContactSubmissions() {
  const [items, setItems] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/saas-admin/contact-submissions", { cache: "no-store" }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load contact enquiries.");
      if (active) setItems(result.submissions ?? []);
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load contact enquiries."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <>
    <div className="admin-header"><div><div className="eyebrow">CUSTOMER OPERATIONS</div><h1>Contact enquiries</h1><p>Messages submitted through the public Contact Us form.</p></div><span className="contact-inbox-count">{items.length} recent</span></div>
    <section className="admin-panel contact-inbox-panel" aria-live="polite">
      {loading && <p>Loading contact enquiries…</p>}
      {error && <p className="error-box">{error}</p>}
      {!loading && !error && items.length === 0 && <p>No contact enquiries have been received yet.</p>}
      {!loading && !error && items.map((item) => <article key={item.id} className="contact-submission-card">
        <div className="contact-submission-head"><strong>{item.name || "Contact enquiry"}</strong><div><span>Submitted</span><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time></div></div>
        {(item.phone_number || item.email) && <p className="contact-submission-meta">{item.phone_number && <a href={`tel:${item.phone_number}`}>{item.phone_number}</a>}{item.phone_number && item.email && " · "}{item.email && <a href={`mailto:${item.email}`}>{item.email}</a>}</p>}
        <div className="contact-submission-details">{(item.responses ?? []).map((response, index) => <p key={index}><b>{response.label}:</b> {response.value || <span className="empty-submission-value">Not provided</span>}</p>)}</div>
      </article>)}
    </section>
  </>;
}
