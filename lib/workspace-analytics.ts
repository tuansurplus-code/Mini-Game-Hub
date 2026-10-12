import { hasWorkspacePlanFeature } from "./game-template-access";

export const CAMPAIGN_ANALYTICS_PLAN_FEATURE = "campaign_analytics";
const GTM_CONTAINER_PATTERN = /^GTM-[A-Z0-9]+$/;

type ObjectValue = Record<string, unknown>;
const asObject = (value: unknown): ObjectValue =>
  value && typeof value === "object" && !Array.isArray(value) ? value as ObjectValue : {};

export function normalizeGtmContainerId(value: unknown) {
  if (typeof value !== "string") return "";
  const id = value.trim().toUpperCase();
  return GTM_CONTAINER_PATTERN.test(id) ? id : "";
}

export async function getWorkspaceCampaignAnalytics(supabase: any, workspaceId: string) {
  const [available, workspaceResult] = await Promise.all([
    hasWorkspacePlanFeature(supabase, workspaceId, CAMPAIGN_ANALYTICS_PLAN_FEATURE),
    supabase.from("workspaces").select("settings").eq("id", workspaceId).maybeSingle(),
  ]);
  if (workspaceResult.error) throw workspaceResult.error;
  const settings = asObject(workspaceResult.data?.settings);
  const integrations = asObject(settings.integrations);
  const googleTagManager = asObject(integrations.google_tag_manager);
  const containerId = normalizeGtmContainerId(googleTagManager.container_id);
  return {
    available,
    enabled: available && googleTagManager.enabled === true && Boolean(containerId),
    containerId,
  };
}
