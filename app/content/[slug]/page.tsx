"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
type Field = { id: string; label: string; type: "text" | "tel" | "email" | "textarea"; enabled: boolean; required: boolean };
type Page = { slug: string; title: string; published: { body?: string; fields?: Field[] } };
type Theme = { colors: { primary: string; pageBackground: string; heroBackground: string; footerBackground: string }; fonts: { body: string } };
export default function PublicContentPage() {
  const params = useParams<{ slug: string }>(); const slug = params.slug;
  const [page, setPage] = useState<Page | null>(null); const [theme, setTheme] = useState<Theme | null>(null); const [values, setValues] = useState<Record<string, string>>({}); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { fetch(`/api/public/content-pages/${slug}`).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "This page could not be loaded."); setPage(result.page); setTheme(result.theme); }).catch(error => setNotice(error instanceof Error ? error.message : "This page could not be loaded.")); }, [slug]);
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setNotice(""); try { const response = await fetch("/api/public/contact-submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields: values }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to send your message."); setValues({}); setNotice(result.message || "Your message has been received."); } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to send your message."); } finally { setBusy(false); } }
  if (!page) return <main className="public-content-page"><p>{notice || "Loading…"}</p></main>;
  const colors = theme?.colors;
  return <main className="public-content-page" style={{ background: colors?.pageBackground, fontFamily: theme?.fonts.body }}><header><Link href="/" className="brand">MINI GAME HUB</Link><Link href="/">Home</Link></header><article style={{ "--content-primary": colors?.primary, "--content-hero": colors?.heroBackground } as CSSProperties}><div className="eyebrow">MINI GAME HUB</div><h1>{page.title}</h1>{slug === "contact" ? <form className="public-contact-form" onSubmit={submit}>{(page.published.fields ?? []).filter(field => field.enabled).map(field => <label key={field.id}>{field.label}{field.type === "textarea" ? <textarea required={field.required} value={values[field.id] ?? ""} onChange={e => setValues(current => ({ ...current, [field.id]: e.target.value }))} /> : <input type={field.type === "tel" ? "tel" : field.type} required={field.required} value={values[field.id] ?? ""} onChange={e => setValues(current => ({ ...current, [field.id]: e.target.value }))} />}</label>)}<button disabled={busy}>{busy ? "Sending…" : "Send message"}</button>{notice && <p role="status">{notice}</p>}</form> : <div className="public-content-body">{page.published.body?.split("\n").map((line, index) => <p key={index}>{line || <br />}</p>)}</div>}</article><footer style={{ background: colors?.footerBackground }}>© 2026 Mini Game Hub</footer></main>;
}
