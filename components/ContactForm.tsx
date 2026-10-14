"use client";
import { useState, type FormEvent } from "react";
import type { ContactField } from "../lib/public-content";
export default function ContactForm({ fields }: { fields: ContactField[] }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/public/contact-submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields: values }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to send your message.");
      setValues({}); setNotice(result.message || "Your message has been received.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to send your message."); }
    finally { setBusy(false); }
  }
  return <form className="public-contact-form" onSubmit={submit}>
    {fields.filter(field => field.enabled).map(field => <label key={field.id}>{field.label}{field.type === "textarea" ?
      <textarea required={field.required} value={values[field.id] ?? ""} onChange={event => setValues(current => ({ ...current, [field.id]: event.target.value }))}/> :
      <input type={field.type} required={field.required} value={values[field.id] ?? ""} onChange={event => setValues(current => ({ ...current, [field.id]: event.target.value }))}/>}</label>)}
    <button disabled={busy}>{busy ? "Sending…" : "Send message"}</button>{notice && <p role="status">{notice}</p>}
  </form>;
}
