"use client";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabase } from "../../../lib/supabase";
import AdminModal from "../AdminModal";

type Props = { email: string; displayName: string; name: string; slug: string; status: string; role: string; logoUrl: string; brandColor: string; contactNumber: string };
const field = { display: "block", width: "100%", padding: 12, margin: "8px 0 18px", border: "1px solid #d1d5db", borderRadius: 9 };
export default function AccountForms(props: Props) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<"personal" | "business">("personal");
  const [displayName, setDisplayName] = useState(props.displayName);
  const [name, setName] = useState(props.name);
  const [logoUrl, setLogoUrl] = useState(props.logoUrl);
  const [brandColor, setBrandColor] = useState(props.brandColor);
  const [contactNumber, setContactNumber] = useState(props.contactNumber);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
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
  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordMessage("");
    if (newPassword.length < 8) { setPasswordMessage("Use at least 8 characters for the new password."); return; }
    if (newPassword !== confirmPassword) { setPasswordMessage("The new passwords do not match."); return; }
    setSavingPassword(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: props.email, password: currentPassword });
      if (verifyError) throw new Error("Your current password is incorrect.");
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setPasswordMessage("Password changed successfully.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setShowPasswordForm(false);
    } catch (error) {
      setPasswordMessage(error instanceof Error ? error.message : "Unable to change your password. Please try again.");
    } finally { setSavingPassword(false); }
  }
  async function saveBusiness(event: FormEvent) {
    event.preventDefault(); setSavingBusiness(true); setBusinessMessage("");
    try {
      const response = await fetch("/api/admin/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, contact_number: contactNumber, logo_url: logoUrl, brand_color: brandColor }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save your business profile.");
      setBusinessMessage("Business profile saved."); router.refresh();
    } catch (error) { setBusinessMessage(error instanceof Error ? error.message : "Unable to save your business profile."); }
    finally { setSavingBusiness(false); }
  }
  return <div className="account-settings">
    <div className="account-section-switcher" role="group" aria-label="Account settings sections">
      <button type="button" className={activeSection === "personal" ? "is-selected" : ""} aria-pressed={activeSection === "personal"} onClick={() => setActiveSection("personal")}>Personal Account</button>
      <button type="button" className={activeSection === "business" ? "is-selected" : ""} aria-pressed={activeSection === "business"} onClick={() => setActiveSection("business")}>Business Profile</button>
    </div>
    {activeSection === "personal" && <section className="admin-panel"><h2>Personal account</h2><p><b>Email:</b> {props.email}</p>
      {props.role === "viewer" ? <p><b>Display name:</b> {displayName || "Not set"}</p> : <form onSubmit={savePersonal}><label htmlFor="display-name">Display name</label><input id="display-name" style={field} autoComplete="name" maxLength={100} value={displayName} onChange={e => setDisplayName(e.target.value)} />
        <p role="status" aria-live="polite">{personalMessage}</p><button className="primary-btn" disabled={savingPersonal}>{savingPersonal ? "Saving…" : "Save personal profile"}</button></form>}
      <button type="button" className="secondary-btn" onClick={() => { setPasswordMessage(""); setShowPasswordForm(true); }}>Change password</button>{passwordMessage && <p role="status" aria-live="polite">{passwordMessage}</p>}
      <AdminModal open={showPasswordForm} title="Change password" onClose={() => { setShowPasswordForm(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordMessage(""); }} maxWidth={520}>
        <form onSubmit={changePassword}>
          <label>Current password<input style={field} type="password" autoComplete="current-password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></label>
          <label>New password<input style={field} type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={event => setNewPassword(event.target.value)} /></label>
          <label>Confirm new password<input style={field} type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></label>
          {passwordMessage && <p role="alert" style={{ color: "#991b1b", margin: 0 }}>{passwordMessage}</p>}
          <button className="primary-btn" disabled={savingPassword}>{savingPassword ? "Updating…" : "Update password"}</button>
        </form>
      </AdminModal>
    </section>}
    {activeSection === "business" && <section className="admin-panel"><h2>Business profile</h2><p><b>Workspace:</b> {props.slug} · <b>Status:</b> {props.status} · <b>Your role:</b> {props.role}</p>
      {!owner && <p>The workspace owner manages the business profile.</p>}
      <form onSubmit={saveBusiness}><fieldset disabled={!owner || savingBusiness} style={{ border: 0, padding: 0, margin: 0 }}>
        <label htmlFor="business-name">Business name</label><input id="business-name" style={field} required maxLength={100} value={name} onChange={e => setName(e.target.value)} />
        <label htmlFor="contact-number">Contact number <span aria-hidden="true" style={{ color: "#b91c1c" }}>*</span></label><input id="contact-number" style={field} type="tel" autoComplete="tel" inputMode="tel" placeholder="+94 77 123 4567" required maxLength={20} value={contactNumber} onChange={e => setContactNumber(e.target.value)} />
        <label htmlFor="logo-url">Logo URL</label><input id="logo-url" style={field} type="url" maxLength={2048} placeholder="https://example.com/logo.png" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} />
        <label htmlFor="brand-color">Brand color</label><input id="brand-color" style={{ ...field, width: 100, height: 48 }} type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} />
        <p>Save your business branding here. Each campaign currently keeps its own appearance settings.</p>
        {owner && <button className="primary-btn" disabled={savingBusiness}>{savingBusiness ? "Saving…" : "Save business profile"}</button>}
      </fieldset><p role="status" aria-live="polite">{businessMessage}</p></form>
    </section>}
  </div>;
}
