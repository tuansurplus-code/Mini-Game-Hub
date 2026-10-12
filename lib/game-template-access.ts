export const GAME_CUSTOMIZATION_CATEGORIES = ["text", "colors", "styles", "advanced"] as const;
export type GameCustomizationCategory = (typeof GAME_CUSTOMIZATION_CATEGORIES)[number];
const DEFAULT_CUSTOMIZATIONS: GameCustomizationCategory[] = ["text", "colors", "styles", "advanced"];

async function resolveWorkspacePlan(supabase: any, workspaceId: string) {
  const { data: subscription, error } = await supabase.from("workspace_subscriptions")
    .select("plan_id,status,period_end").eq("workspace_id", workspaceId).maybeSingle();
  if (error) throw error;
  if (subscription?.status === "grandfathered") return { planId: null as string | null, unrestricted: true };
  if (subscription?.status === "active" && subscription.plan_id &&
      (!subscription.period_end || new Date(subscription.period_end).getTime() > Date.now())) {
    return { planId: subscription.plan_id as string, unrestricted: false };
  }
  const { data: freePlan, error: freeError } = await supabase.from("subscription_plans")
    .select("id").eq("slug", "free").eq("active", true).maybeSingle();
  if (freeError) throw freeError;
  return { planId: freePlan?.id ?? null, unrestricted: false };
}

export async function getWorkspaceGameOptions(supabase: any, workspaceId: string) {
  const { planId, unrestricted } = await resolveWorkspacePlan(supabase, workspaceId);
  const [{ data: templates, error: templatesError }, permissionsResult] = await Promise.all([
    supabase.from("platform_game_templates").select("game_type,name,description,active,feature_flags,default_appearance").eq("active", true).order("name"),
    planId ? supabase.from("subscription_plan_game_permissions").select("game_type,enabled,allowed_customizations").eq("plan_id", planId) : Promise.resolve({ data: [], error: null }),
  ]);
  if (templatesError || permissionsResult.error) throw templatesError || permissionsResult.error;
  const permissions = new Map((permissionsResult.data ?? []).map((row: any) => [row.game_type, row]));
  return (templates ?? []).map((template: any) => {
    const permission: any = permissions.get(template.game_type);
    return {
      ...template,
      available: unrestricted || permission?.enabled !== false,
      allowed_customizations: unrestricted ? [...GAME_CUSTOMIZATION_CATEGORIES] : permission?.allowed_customizations ?? DEFAULT_CUSTOMIZATIONS,
    };
  });
}

export async function getWorkspaceGamePolicy(supabase: any, workspaceId: string, gameType: string) {
  const { planId, unrestricted } = await resolveWorkspacePlan(supabase, workspaceId);
  const [{ data: template, error: templateError }, permissionResult] = await Promise.all([
    supabase.from("platform_game_templates").select("game_type,name,active,feature_flags,default_appearance").eq("game_type", gameType).maybeSingle(),
    planId ? supabase.from("subscription_plan_game_permissions").select("enabled,allowed_customizations").eq("plan_id", planId).eq("game_type", gameType).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (templateError || permissionResult.error) throw templateError || permissionResult.error;
  const permission = permissionResult.data;
  return {
    template,
    enabledForPlan: unrestricted || permission?.enabled !== false,
    allowedCustomizations: unrestricted ? [...GAME_CUSTOMIZATION_CATEGORIES] : permission?.allowed_customizations ?? DEFAULT_CUSTOMIZATIONS,
  };
}
