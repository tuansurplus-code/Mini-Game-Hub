import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase-server";

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: memberships, error } = await supabase
    .from("workspace_members")
    .select("workspace_id,role,workspaces!inner(status)")
    .eq("user_id", user.id);

  if (error || !memberships?.length) redirect("/");

  const membership = memberships.find((item: any) => {
    const workspace = Array.isArray(item.workspaces) ? item.workspaces[0] : item.workspaces;
    return workspace?.status === "active" && ["owner", "admin", "editor"].includes(item.role);
  });

  if (!membership) redirect("/");

  return {
    user,
    workspaceId: membership.workspace_id,
    role: membership.role as WorkspaceRole,
  };
}
