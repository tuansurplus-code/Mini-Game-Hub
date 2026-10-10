import { requireAdmin } from "../../../lib/admin-auth";
import BillingManager from "./BillingManager";

export default async function BillingPage() {
  const { role } = await requireAdmin();
  return <BillingManager role={role} />;
}
