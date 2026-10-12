import { createSupabaseAdminClient } from "./supabase-admin";

export const GAME_CUSTOMIZATION_CATEGORIES = ["text", "colors", "styles", "advanced"] as const;
export type GameCustomizationCategory = (typeof GAME_CUSTOMIZATION_CATEGORIES)[number];
type WorkspacePlan = { planId: string | null; unrestricted: boolean; featureFlags: Record<string, unknown> };

function asFeatureFlags(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

async function resolveWorkspacePlan(supabase: any, workspaceId: string): Promise<WorkspacePlan> {
  const { data: subscription, error } = await supabase.from("workspace_subscriptions")
    .select("plan_id,status,period_end")
    .eq("workspace_id", workspaceId).maybeSingle();
  if (error) throw error;
  if (subscription?.status === "grandfathered") {
    return { planId: null, unrestricted: true, featureFlags: {} };
  }

  const admin = createSupabaseAdminClient();
  const hasCurrentSubscription = subscription?.status === "active" && subscription.plan_id &&
    (!subscription.period_end || new Date(subscription.period_end).getTime() > Date.now());
  const planQuery = hasCurrentSubscription
    ? admin.from("subscription_plans").select("id,feature_flags").eq("id", subscription.plan_id).maybeSingle()
    : admin.from("subscription_plans").select("id,feature_flags").eq("slug", "free").eq("active", true).maybeSingle();
  const { data: plan, error: planError } = await planQuery;
  if (planError) throw planError;
  return {
    planId: plan?.id ?? null,
    unrestricted: false,
    featureFlags: asFeatureFlags(plan?.feature_flags),
  };
}

export async function hasWorkspacePlanFeature(supabase: any, workspaceId: string, feature: string) {
  const plan = await resolveWorkspacePlan(supabase, workspaceId);
  return plan.unrestricted || plan.featureFlags[feature] === true;
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
    const allowed = Array.isArray(permission?.allowed_customizations)
      ? permission.allowed_customizations.filter((item: unknown): item is GameCustomizationCategory =>
          GAME_CUSTOMIZATION_CATEGORIES.includes(item as GameCustomizationCategory))
      : [];
    return {
      ...template,
      available: unrestricted || permission?.enabled === true,
      allowed_customizations: unrestricted ? [...GAME_CUSTOMIZATION_CATEGORIES] : allowed,
    };
  });
}

export async function getWorkspaceGamePolicy(supabase: any, workspaceId: string, gameType: string) {
  const plan = await resolveWorkspacePlan(supabase, workspaceId);
  const [{ data: template, error: templateError }, permissionResult] = await Promise.all([
    supabase.from("platform_game_templates").select("game_type,name,active,feature_flags,default_appearance").eq("game_type", gameType).maybeSingle(),
    plan.planId ? supabase.from("subscription_plan_game_permissions").select("enabled,allowed_customizations").eq("plan_id", plan.planId).eq("game_type", gameType).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (templateError || permissionResult.error) throw templateError || permissionResult.error;
  const permission = permissionResult.data;
  const allowed = Array.isArray(permission?.allowed_customizations)
    ? permission.allowed_customizations.filter((item: unknown): item is GameCustomizationCategory =>
        GAME_CUSTOMIZATION_CATEGORIES.includes(item as GameCustomizationCategory))
    : [];
  return {
    template,
    enabledForPlan: plan.unrestricted || permission?.enabled === true,
    allowedCustomizations: plan.unrestricted ? [...GAME_CUSTOMIZATION_CATEGORIES] : allowed,
    customBrandingAllowed: plan.unrestricted || plan.featureFlags.custom_branding === true,
  };
}
