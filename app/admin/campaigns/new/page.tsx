import { requireAdmin } from "../../../../lib/admin-auth";
import { builderGame } from "../../../../lib/game-builder";
import NewCampaignBuilder from "../NewCampaignBuilder";

export default async function NewCampaignPage({ searchParams }: {
  searchParams: Promise<{ game?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  return <NewCampaignBuilder initialGame={builderGame(query.game)} />;
}
