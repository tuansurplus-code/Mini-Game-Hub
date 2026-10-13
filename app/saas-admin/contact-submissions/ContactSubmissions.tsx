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
    <div className="admin-header"><div><div className="eyebrow">PUBLIC WEBSITE</div><h1>Contact Submissions</h1><p>Messages submitted through the public Contact Us form.</p></div><span className="contact-inbox-count">{items.length} submissions</span></div>
    <section className="admin-panel contact-inbox-panel" aria-live="polite">
      {loading && <p>Loading contact enquiries…</p>}
      {error && <p className="error-box">{error}</p>}
      {!loading && !error && items.length === 0 && <p>No contact enquiries have been received yet.</p>}
      {!loading && !error && items.length > 0 && <div style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table className="admin-table" aria-label="Contact enquiries" style={{ minWidth: 900, width: "100%" }}>
          <thead>
            <tr><th scope="col">Submitted</th><th scope="col">Name</th><th scope="col">Phone</th><th scope="col">Email</th><th scope="col">Details</th></tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time></td>
                <td>{item.name || <span className="empty-submission-value">Not provided</span>}</td>
                <td>{item.phone_number ? <a href={`tel:${item.phone_number}`} style={{ whiteSpace: "nowrap" }}>{item.phone_number}</a> : <span className="empty-submission-value">Not provided</span>}</td>
                <td>{item.email ? <a href={`mailto:${item.email}`} style={{ overflowWrap: "anywhere" }}>{item.email}</a> : <span className="empty-submission-value">Not provided</span>}</td>
                <td>
                  {(item.responses ?? []).length > 0 ? <dl style={{ display: "grid", gridTemplateColumns: "max-content minmax(120px, 1fr)", gap: "6px 12px", margin: 0 }}>
                    {(item.responses ?? []).map((response, index) => (
                      <div key={`${response.label}-${index}`} style={{ display: "contents" }}>
                        <dt style={{ fontWeight: 700, color: "var(--admin-text)" }}>{response.label}</dt>
                        <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{response.value || <span className="empty-submission-value">Not provided</span>}</dd>
                      </div>
                    ))}
                  </dl> : <span className="empty-submission-value">No additional details</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </section>
  </>;
}
