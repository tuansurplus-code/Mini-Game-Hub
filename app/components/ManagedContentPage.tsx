"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { ContactFormConfig, ContactFormField, ManagedPage, ManagedPageSlug } from "../../lib/homepage-content";

type PublicContentPageProps = { slug: ManagedPageSlug };

function ContactInput({ field }: { field: ContactFormField }) {
  const label = field.required ? `${field.label}*` : field.label;
  const common = { id: field.id, name: field.id, required: field.required, maxLength: field.type === "textarea" ? 5000 : 500, "aria-label": label };
  return <label className={`public-contact-field public-contact-field-${field.type}`} htmlFor={field.id}>
    <span className="sr-only">{label}</span>
    {field.type === "textarea" ? <textarea {...common} rows={5} placeholder={label} /> : field.type === "select" ? <select {...common} defaultValue=""><option value="" disabled>{label}</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input {...common} type={field.type === "phone" ? "tel" : field.type} autoComplete={field.id === "name" ? "name" : field.id === "email" ? "email" : field.type === "phone" ? "tel" : "off"} placeholder={label} />}
  </label>;
}
function ContactForm({ config }: { config: ContactFormConfig }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setStatus(""); setError(false);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/public/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: Object.fromEntries(config.fields.filter((field) => field.enabled).map((field) => [field.id, String(data.get(field.id) ?? "")])),
          website: data.get("website"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to send your message. Please try again.");
      form.reset(); setStatus("Thank you. Your message has been sent.");
    } catch (reason) {
      setError(true); setStatus(reason instanceof Error ? reason.message : "Unable to send your message. Please try again.");
    } finally { setBusy(false); }
  }
  return <section className="public-contact-form">
    <h2>Leave Your Message</h2>
    <p>{config.intro}</p>
    <p>We’ll use your details to respond to this enquiry. See our <Link href="/privacy-policy">Privacy Policy</Link>.</p>
    <form onSubmit={submit}>
      <div className="public-contact-fields">
        {config.fields.filter((field) => field.enabled).map((field) => <ContactInput key={field.id} field={field} />)}
      </div>
      <label className="contact-website-field" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <button type="submit" disabled={busy}>{busy ? "Sending…" : config.submitLabel}</button>
      {status && <p className={error ? "public-contact-status error" : "public-contact-status"} role="status">{status}</p>}
    </form>
  </section>;
}
export default function PublicContentPage({ slug }: PublicContentPageProps) {
  const [page, setPage] = useState<ManagedPage | null>(null);
  const [contactForm, setContactForm] = useState<ContactFormConfig | null>(null);
  const [status, setStatus] = useState("Loading page…");

  useEffect(() => {
    let active = true;
    fetch("/api/public/homepage")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.content?.pages?.[slug]) throw new Error("This page is not available yet.");
        if (active) {
          setPage(result.content.pages[slug] as ManagedPage);
          setContactForm(result.content.contactForm as ContactFormConfig);
          setStatus("");
        }
      })
      .catch((reason: unknown) => {
        if (active) setStatus(reason instanceof Error ? reason.message : "Unable to load this page.");
      });
    return () => { active = false; };
  }, [slug]);

  return <main className="public-content-page">
    <article className="public-content-shell">
      <Link className="public-content-back" href="/">← Back to Mini Game Hub</Link>
      {page ? <>
        <p className="public-content-brand">Mini Game Hub</p>
        <h1>{page.title}</h1>
        {page.body && <div className="public-content-copy" dangerouslySetInnerHTML={{ __html: page.body }} />}
        {slug === "contact-us" && contactForm && <ContactForm config={contactForm} />}
        {slug !== "contact-us" && !page.body && <p className="public-content-empty">This page is being prepared.</p>}
      </> : <p className="public-content-empty" role="status">{status}</p>}
    </article>
  </main>;
}
