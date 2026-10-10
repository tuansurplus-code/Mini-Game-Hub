import { requirePlatformAdmin } from "../../../lib/platform-auth";
import SubscriptionReviewManager from "./SubscriptionReviewManager";

export default async function SubscriptionRequestsPage() {
  const { role } = await requirePlatformAdmin();
  return <SubscriptionReviewManager canReview={role !== "support"} />;
}
