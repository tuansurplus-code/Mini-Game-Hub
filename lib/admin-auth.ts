import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase-server";

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.app_metadata?.must_change_password === true) redirect("/change-password");

  const { data: memberships, error } = await supabase
    .from("workspace_members")
    .select("workspace_id,role,workspaces!inner(status)")
    .eq("user_id", user.id);

  if (error || !memberships?.length) redirect("/");

  const cookieStore = await cookies();
  const selectedWorkspaceId = cookieStore.get("mini-game-hub-workspace")?.value;
  const membership = memberships.find((item: any) => {
    const workspace = Array.isArray(item.workspaces) ? item.workspaces[0] : item.workspaces;
    return workspace?.status === "active" && ["owner", "admin", "editor", "viewer"].includes(item.role) &&
      (!selectedWorkspaceId || item.workspace_id === selectedWorkspaceId);
  }) ?? memberships.find((item: any) => {
    const workspace = Array.isArray(item.workspaces) ? item.workspaces[0] : item.workspaces;
    return workspace?.status === "active" && ["owner", "admin", "editor", "viewer"].includes(item.role);
  });

  if (!membership) redirect("/");

  return {
    user,
    workspaceId: membership.workspace_id,
    role: membership.role as WorkspaceRole,
  };
}
