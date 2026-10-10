import { requireAdmin } from "../../../lib/admin-auth";
import WinnersReport from "./WinnersReport";

type PageProps = {
  searchParams: Promise<{ campaign?: string | string[] }>;
};

export default async function WinnersPage({ searchParams }: PageProps) {
  const [{ workspaceId }, params] = await Promise.all([requireAdmin(), searchParams]);
  const campaign = typeof params.campaign === "string" ? params.campaign : "";

  return <WinnersReport workspaceId={workspaceId} initialCampaign={campaign} />;
}
