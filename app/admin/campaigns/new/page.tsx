import { redirect } from "next/navigation";
import { requireAdmin } from "../../../../lib/admin-auth";
import { builderGame } from "../../../../lib/game-builder";
import NewCampaignBuilder from "../NewCampaignBuilder";

export default async function NewCampaignPage({ searchParams }: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { role } = await requireAdmin();
  if (role === "viewer") redirect("/admin/campaigns");
  const query = await searchParams;
  return <NewCampaignBuilder initialGame={builderGame(query.game)} />;
}
