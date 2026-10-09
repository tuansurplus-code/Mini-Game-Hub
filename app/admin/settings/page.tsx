import { requireAdmin } from "../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import AccountForms from "./AccountForms";
export default async function Page() {
  const { user, workspaceId, role } = await requireAdmin();
  const s = await createSupabaseServerClient();
  const { data: workspace, error } = await s.from("workspaces").select("name,slug,status,settings").eq("id", workspaceId).single();
  if (error || !workspace) return <div className="error-box">Unable to load your account. Refresh to try again.</div>;
  const profile = workspace.settings?.business_profile;
  return <><div className="admin-header"><div><div className="eyebrow">ACCOUNT & WORKSPACE</div><h1>Account</h1><p>Manage your personal account and business profile.</p></div></div>
    <AccountForms email={user.email ?? ""} displayName={typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : ""}
      name={workspace.name} slug={workspace.slug} status={workspace.status} role={role}
      logoUrl={typeof profile?.logo_url === "string" ? profile.logo_url : ""}
      brandColor={typeof profile?.brand_color === "string" && /^#[0-9a-f]{6}$/i.test(profile.brand_color) ? profile.brand_color : "#e31b23"} />
  </>;
}
