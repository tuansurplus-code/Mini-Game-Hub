import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase-server";

export type PlatformRole = "owner" | "admin" | "support";

export async function requirePlatformAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: platformAdmin, error } = await supabase
    .from("platform_admins")
    .select("role,active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !platformAdmin?.active) redirect("/admin");

  return { user, role: platformAdmin.role as PlatformRole };
}

export async function getPlatformAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("platform_admins")
    .select("role,active")
    .eq("user_id", user.id)
    .maybeSingle();

  return data?.active ? { user, role: data.role as PlatformRole } : null;
}
