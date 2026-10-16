import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase-server";
import PlatformMfa from "./PlatformMfa";
export default async function Page(){
 const db=await createSupabaseServerClient("platform");const{data:{user}}=await db.auth.getUser();if(!user)redirect("/saas-login");
 const{data:staff}=await db.from("platform_admins").select("role,active").eq("user_id",user.id).maybeSingle();
 if(!staff?.active||!["owner","admin","support"].includes(staff.role))redirect("/saas-login?denied=1");
 if(user.app_metadata?.must_change_password===true)redirect("/saas-password");
 const assurance=await db.auth.mfa.getAuthenticatorAssuranceLevel();if(!assurance.error&&assurance.data.currentLevel==="aal2")redirect("/saas-admin");
 return <PlatformMfa/>;
}
