import { requirePlatformAdmin } from "../../../lib/platform-auth";
import SubscriptionReviewManager from "./SubscriptionReviewManager";

export default async function SubscriptionRequestsPage() {
  await requirePlatformAdmin();
  return <SubscriptionReviewManager canReview={true} />;
}
