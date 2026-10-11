"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { ManagedPage, ManagedPageSlug } from "../../lib/homepage-content";

type PublicContentPageProps = { slug: ManagedPageSlug };

function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus("");
    setError(false);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          phoneNumber: data.get("phoneNumber"),
          email: data.get("email"),
          details: data.get("details"),
          website: data.get("website"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to send your message. Please try again.");
      form.reset();
      setStatus("Thank you. Your message has been sent.");
    } catch (reason) {
      setError(true);
      setStatus(reason instanceof Error ? reason.message : "Unable to send your message. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return <section className="public-contact-form">
    <h2>Send us a message</h2>
    <p>Fill in the form and our team will get back to you.</p><p>We’ll use your details to respond to this enquiry. See our <Link href="/privacy-policy">Privacy Policy</Link>.</p>
    <form onSubmit={submit}>
      <div className="public-contact-fields">
        <label><span>Name</span><input name="name" autoComplete="name" maxLength={120} required /></label>
        <label><span>Phone number</span><input name="phoneNumber" type="tel" autoComplete="tel" maxLength={30} required /></label>
        <label><span>Email</span><input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
        <label className="public-contact-details"><span>Details</span><textarea name="details" rows={6} maxLength={5000} required /></label>
      </div>
      <label className="contact-website-field" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <button type="submit" disabled={busy}>{busy ? "Sending…" : "Send message"}</button>
      {status && <p className={error ? "public-contact-status error" : "public-contact-status"} role="status">{status}</p>}
    </form>
  </section>;
}

export default function PublicContentPage({ slug }: PublicContentPageProps) {
  const [page, setPage] = useState<ManagedPage | null>(null);
  const [status, setStatus] = useState("Loading page…");

  useEffect(() => {
    let active = true;
    fetch("/api/public/homepage")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.content?.pages?.[slug]) throw new Error("This page is not available yet.");
        if (active) {
          setPage(result.content.pages[slug] as ManagedPage);
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
        {slug === "contact-us" && <ContactForm />}
        {slug !== "contact-us" && !page.body && <p className="public-content-empty">This page is being prepared.</p>}
      </> : <p className="public-content-empty" role="status">{status}</p>}
    </article>
  </main>;
}
