"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Props = { email: string; displayName: string; name: string; slug: string; status: string; role: string; logoUrl: string; brandColor: string };
const field = { display: "block", width: "100%", padding: 12, margin: "8px 0 18px", border: "1px solid #d1d5db", borderRadius: 9 };
export default function AccountForms(props: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(props.displayName);
  const [name, setName] = useState(props.name);
  const [logoUrl, setLogoUrl] = useState(props.logoUrl);
  const [brandColor, setBrandColor] = useState(props.brandColor);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [personalMessage, setPersonalMessage] = useState("");
  const [businessMessage, setBusinessMessage] = useState("");
  const owner = props.role === "owner";
  async function savePersonal(event: FormEvent) {
    event.preventDefault(); setSavingPersonal(true); setPersonalMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ data: { display_name: displayName.trim() } });
      if (error) throw error;
      setPersonalMessage("Your personal profile has been saved."); router.refresh();
    } catch { setPersonalMessage("Unable to save your profile. Please try again."); }
    finally { setSavingPersonal(false); }
  }
  async function saveBusiness(event: FormEvent) {
    event.preventDefault(); setSavingBusiness(true); setBusinessMessage("");
    try {
      const response = await fetch("/api/admin/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, logo_url: logoUrl, brand_color: brandColor }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save your business profile.");
      setBusinessMessage("Business profile saved."); router.refresh();
    } catch (error) { setBusinessMessage(error instanceof Error ? error.message : "Unable to save your business profile."); }
    finally { setSavingBusiness(false); }
  }
  return <div style={{ display: "grid", gap: 24, maxWidth: 760 }}>
    <section className="admin-panel"><h2>Personal account</h2><p><b>Email:</b> {props.email}</p>
      {props.role === "viewer" ? <p><b>Display name:</b> {displayName || "Not set"}</p> : <form onSubmit={savePersonal}><label htmlFor="display-name">Display name</label><input id="display-name" style={field} autoComplete="name" maxLength={100} value={displayName} onChange={e => setDisplayName(e.target.value)} />
        <p role="status" aria-live="polite">{personalMessage}</p><button className="primary-btn" disabled={savingPersonal}>{savingPersonal ? "Saving…" : "Save personal profile"}</button></form>}
      <p><Link href="/forgot-password">Reset your password</Link></p>
    </section>
    <section className="admin-panel"><h2>Business profile</h2><p><b>Workspace:</b> {props.slug} · <b>Status:</b> {props.status} · <b>Your role:</b> {props.role}</p>
      {!owner && <p>The workspace owner manages the business profile.</p>}
      <form onSubmit={saveBusiness}><fieldset disabled={!owner || savingBusiness} style={{ border: 0, padding: 0, margin: 0 }}>
        <label htmlFor="business-name">Business name</label><input id="business-name" style={field} required maxLength={100} value={name} onChange={e => setName(e.target.value)} />
        <label htmlFor="logo-url">Logo URL</label><input id="logo-url" style={field} type="url" maxLength={2048} placeholder="https://example.com/logo.png" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} />
        <label htmlFor="brand-color">Brand color</label><input id="brand-color" style={{ ...field, width: 100, height: 48 }} type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} />
        <p>Save your business branding here. Each campaign currently keeps its own appearance settings.</p>
        {owner && <button className="primary-btn" disabled={savingBusiness}>{savingBusiness ? "Saving…" : "Save business profile"}</button>}
      </fieldset><p role="status" aria-live="polite">{businessMessage}</p></form>
    </section>
  </div>;
}
