import { redirect } from "next/navigation";
import HomepageClient from "../components/HomepageClient";
import HomepageEffects from "../components/HomepageEffects";
import CustomerCampaignTagManager from "../components/CustomerCampaignTagManager";
import { getPublicHomepage } from "../lib/public-homepage";

// Resolve published pages and schedules on each request; never cache a draft or an expired theme.
export const dynamic = "force-dynamic";
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const value = (key: string) => { const item = params[key]; return Array.isArray(item) ? item[0] : item; };
  if (value("error") || value("error_code")) {
    const query = new URLSearchParams();
    for (const key of ["error", "error_code", "error_description"]) { const item = value(key); if (item) query.set(key, item); }
    redirect(`/auth-error?${query.toString()}`);
  }
  const home = await getPublicHomepage();
  return <HomepageClient content={home.content} pageKind={home.pageKind} plans={home.plans} siteTheme={home.siteTheme}>
    {home.pageKind !== "custom" && <HomepageEffects pageKind={home.pageKind}/>}
    <CustomerCampaignTagManager containerId={home.analytics?.gtmEnabled ? home.analytics.gtmContainerId : ""}/>
  </HomepageClient>;
}
