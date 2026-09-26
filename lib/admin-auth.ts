import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase-server";

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id);

  if (error || !memberships || memberships.length === 0) {
    redirect("/");
  }

  const membership = memberships[0];

  if (!["owner", "admin", "editor"].includes(membership.role)) {
    redirect("/");
  }

  return {
    user,
    workspaceId: membership.workspace_id,
    role: membership.role,
  };
}
