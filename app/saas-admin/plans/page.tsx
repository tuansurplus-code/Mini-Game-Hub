import { requirePlatformAdmin } from "../../../lib/platform-auth";
import PlanManager from "./PlanManager";

export default async function PlansPage() {
  const { role } = await requirePlatformAdmin();
  return <>
    <div className="admin-header">
      <div>
        <div className="eyebrow">COMMERCIAL</div>
        <h1>Plans & Limits</h1>
        <p>Set monthly prices, account limits and included features. Prices are in LKR.</p>
      </div>
    </div>
    <PlanManager canEdit={role !== "support"} />
  </>;
}
