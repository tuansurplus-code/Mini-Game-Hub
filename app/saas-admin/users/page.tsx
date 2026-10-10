import StaffManager from "./StaffManager";
import { requirePlatformAdmin } from "../../../lib/platform-auth";

export default async function PlatformStaffPage() {
  await requirePlatformAdmin();
  return <StaffManager />;
}
